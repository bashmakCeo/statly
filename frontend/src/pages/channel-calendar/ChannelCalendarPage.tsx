import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { useChannels } from "../../features/channels/useChannels";
import { getCalendarChannelList } from "../../features/channels/getCalendarChannelList";
import {
  getOnboardingCalendarCountsByDate,
  getOnboardingCalendarPath,
  getOnboardingCalendarSelectedDateCount,
  isOnboardingCalendarPath,
  ONBOARDING_CALENDAR_CHANNEL,
} from "../../features/onboarding/onboardingCalendarMock";
import { useOnboarding } from "../../features/onboarding/useOnboarding";
import { getPlacementCountsByChannelDateRange } from "../../features/placements/api";
import { getPlacementDataVersion } from "../../features/placements/placementDataVersion";
import { useWeekPlacementCounts } from "../../features/placements/weekDataStore";
import { useProfile } from "../../features/profile/profileCache";
import {
  addMonths,
  calendarMonthNames,
  calendarWeekDays,
  getCalendarMonthDays,
  getYearDateRange,
  isSameCalendarDate,
} from "../../shared/lib/calendar";
import { getCurrentWeek, getDateKey, getShortDateLabel, isSameDate, parseDateKey } from "../../shared/lib/date";
import { getDateKeyInTimezone, resolveTimezone } from "../../shared/lib/timezone";
import { getPlannedPostVerb, getPostsWord } from "../../shared/lib/text";
import { ChannelAvatar } from "../../shared/ui/ChannelAvatar/ChannelAvatar";
import { CalendarSkeleton } from "../../shared/ui/CalendarSkeleton/CalendarSkeleton";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { ChannelListSkeleton } from "../../widgets/channel-list/ChannelListSkeleton";
import { OnboardingCalendarOverlay } from "../../widgets/onboarding/OnboardingCalendarOverlay";

type ChannelCalendarLocationState = {
  selectedDate?: string;
  fromHome?: boolean;
};

export function ChannelCalendarPage() {
  const navigate = useNavigate();
  const { channelId } = useParams();
  const location = useLocation();
  const locationState = location.state as ChannelCalendarLocationState | null;
  const parsedChannelId = Number(channelId);
  const {
    completeCalendarStep,
    isCalendarDemoActive,
    isCalendarOnboardingPending,
    isCalendarOverlayVisible,
  } = useOnboarding();
  const { user } = useProfile();
  const timezone = resolveTimezone(user?.timezone);
  const isOnboardingDemo = isCalendarDemoActive;
  const onboardingCalendarCountsByDate = useMemo(() => getOnboardingCalendarCountsByDate(), []);
  const today = useMemo(
    () => parseDateKey(getDateKeyInTimezone(new Date(), timezone)) ?? new Date(),
    [timezone],
  );
  const selectedDate = parseDateKey(locationState?.selectedDate) ?? today;
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const [countsByDate, setCountsByDate] = useState<Record<string, number>>({});
  const [countsError, setCountsError] = useState<string | null>(null);
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const countsCacheRef = useRef<Record<string, number>>({});
  const loadedYearsRef = useRef<Set<number>>(new Set());
  const placementDataVersionRef = useRef(getPlacementDataVersion());
  const { channels, error, isLoading } = useChannels();
  const selectedDateKey = getDateKey(selectedDate);
  const weekDays = useMemo(() => getCurrentWeek(selectedDate), [selectedDate]);
  const weekDateKeys = useMemo(() => weekDays.map((day) => getDateKey(day)), [weekDays]);
  const { countsByChannel: placementCountsByChannel } = useWeekPlacementCounts(
    selectedDateKey,
    weekDateKeys[0],
    weekDateKeys[weekDateKeys.length - 1],
  );
  const calendarChannels = useMemo(
    () => (isOnboardingDemo ? [ONBOARDING_CALENDAR_CHANNEL] : getCalendarChannelList(channels, placementCountsByChannel)),
    [channels, isOnboardingDemo, placementCountsByChannel],
  );
  const channelIndex = calendarChannels.findIndex((item) => item.id === parsedChannelId);
  const channel = isOnboardingDemo
    ? ONBOARDING_CALENDAR_CHANNEL
    : channelIndex >= 0
      ? calendarChannels[channelIndex]
      : channels.find((item) => item.id === parsedChannelId);
  const previousChannel = channelIndex > 0 ? calendarChannels[channelIndex - 1] : undefined;
  const nextChannel =
    channelIndex >= 0 && channelIndex < calendarChannels.length - 1
      ? calendarChannels[channelIndex + 1]
      : undefined;
  const calendarNavigationState = {
    fromHome: locationState?.fromHome,
    selectedDate: selectedDateKey,
  };
  const monthDays = useMemo(() => getCalendarMonthDays(calendarMonth), [calendarMonth]);
  const activeCountsByDate = isOnboardingDemo ? onboardingCalendarCountsByDate : countsByDate;
  const selectedDateCount = isOnboardingDemo
    ? getOnboardingCalendarSelectedDateCount(onboardingCalendarCountsByDate, selectedDateKey)
    : countsByDate[selectedDateKey] ?? 0;
  const selectedPostsText = `${selectedDateCount} ${getPostsWord(selectedDateCount)}`;
  const selectedPlannedVerb = getPlannedPostVerb(selectedDateCount);

  useEffect(() => {
    if (isOnboardingDemo) {
      return;
    }

    countsCacheRef.current = {};
    loadedYearsRef.current.clear();
    setCountsByDate({});
    setCountsError(null);
    setIsCountsLoading(false);
  }, [isOnboardingDemo, parsedChannelId]);

  useEffect(() => {
    if (isOnboardingDemo || channel === undefined) {
      setCountsByDate({});
      setCountsError(null);
      setIsCountsLoading(false);
      return;
    }

    const year = calendarMonth.getFullYear();
    const currentPlacementDataVersion = getPlacementDataVersion();

    if (currentPlacementDataVersion !== placementDataVersionRef.current) {
      placementDataVersionRef.current = currentPlacementDataVersion;
      countsCacheRef.current = {};
      loadedYearsRef.current.clear();
    }

    if (loadedYearsRef.current.has(year)) {
      setCountsByDate({ ...countsCacheRef.current });
      setCountsError(null);
      setIsCountsLoading(false);
      return;
    }

    const { startDate, endDate } = getYearDateRange(year);
    let ignoreResult = false;

    setIsCountsLoading(true);
    setCountsError(null);

    getPlacementCountsByChannelDateRange(
      parsedChannelId,
      getDateKey(startDate),
      getDateKey(endDate),
    )
      .then((loadedCounts) => {
        if (!ignoreResult) {
          countsCacheRef.current = {
            ...countsCacheRef.current,
            ...loadedCounts,
          };
          loadedYearsRef.current.add(year);
          setCountsByDate({ ...countsCacheRef.current });
        }
      })
      .catch((loadError: unknown) => {
        if (!ignoreResult) {
          setCountsError("Не удалось загрузить календарь");
          console.error("Channel calendar loading failed", loadError);
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsCountsLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [calendarMonth, channel, isOnboardingDemo, parsedChannelId]);

  if (Number.isNaN(parsedChannelId)) {
    return <Navigate to="/" replace />;
  }

  if (
    isCalendarOnboardingPending &&
    location.pathname.endsWith("/calendar") &&
    !isOnboardingCalendarPath(location.pathname)
  ) {
    return <Navigate to={getOnboardingCalendarPath()} replace />;
  }

  function handleBack() {
    if (isOnboardingDemo) {
      navigate("/");
      return;
    }

    if (locationState?.fromHome) {
      navigate("/", { state: { selectedDate: selectedDateKey } });
      return;
    }

    navigate(`/channels/${parsedChannelId}`, {
      state: { selectedDate: selectedDateKey },
    });
  }

  function handleChannelChange(nextChannelId: number) {
    navigate(`/channels/${nextChannelId}/calendar`, {
      replace: true,
      state: calendarNavigationState,
    });
  }

  return (
    <PageLayout>
      <div className="channel-calendar-page__top">
        <section className="channel-calendar-page__nav-card page-card" aria-label="Навигация">
          <div className="channel-calendar-page__nav">
            <button className="nav-button nav-button--back" type="button" onClick={handleBack}>
              Назад
            </button>
            <span className="channel-calendar-page__year">{calendarMonth.getFullYear()}</span>
          </div>
        </section>

        {isOnboardingDemo ? null : isLoading ? <ChannelListSkeleton rows={1} /> : null}
        {!isOnboardingDemo && error !== null ? <StateMessage variant="error">{error}</StateMessage> : null}
        {!isOnboardingDemo && !isLoading && error === null && channel === undefined ? (
          <StateMessage>Канал не найден</StateMessage>
        ) : null}
        {(isOnboardingDemo || (!isLoading && error === null && channel !== undefined)) && channel !== undefined ? (
          <section
            className={
              !isOnboardingDemo && calendarChannels.length > 1
                ? "channel-calendar-page__channel-card channel-calendar-page__channel-card--with-nav page-card"
                : "channel-calendar-page__channel-card page-card"
            }
            aria-label="Канал"
          >
            {!isOnboardingDemo && calendarChannels.length > 1 ? (
              <button
                aria-label="Предыдущий канал"
                className="channel-calendar-page__channel-arrow"
                disabled={previousChannel === undefined}
                type="button"
                onClick={() => {
                  if (previousChannel !== undefined) {
                    handleChannelChange(previousChannel.id);
                  }
                }}
              >
                ‹
              </button>
            ) : null}
            <ChannelAvatar channel={channel} size="md" />
            <div className="channel-calendar-page__channel-info">
              <h1>{channel.title}</h1>
              <p>
                На {getShortDateLabel(selectedDate)} {selectedPlannedVerb}:{" "}
                <span>{selectedPostsText}</span>
              </p>
            </div>
            { !isOnboardingDemo && calendarChannels.length > 1 ? (
              <button
                aria-label="Следующий канал"
                className="channel-calendar-page__channel-arrow"
                disabled={nextChannel === undefined}
                type="button"
                onClick={() => {
                  if (nextChannel !== undefined) {
                    handleChannelChange(nextChannel.id);
                  }
                }}
              >
                ›
              </button>
            ) : null}
          </section>
        ) : null}
      </div>

      <PageContent ariaLabel="Календарь канала" className="channel-calendar-page__content">
        {!isOnboardingDemo && countsError !== null ? (
          <StateMessage variant="error">{countsError}</StateMessage>
        ) : null}
        {!isOnboardingDemo && isCountsLoading ? <CalendarSkeleton /> : null}
        {(isOnboardingDemo || (!isCountsLoading && countsError === null)) ? (
          <section className="channel-calendar-page__calendar">
            <header className="channel-calendar-page__calendar-header">
              <h2>{calendarMonthNames[calendarMonth.getMonth()]}</h2>
              <div className="channel-calendar-page__calendar-nav">
                <button
                  aria-label="Предыдущий месяц"
                  type="button"
                  onClick={() => setCalendarMonth((currentMonth) => addMonths(currentMonth, -1))}
                >
                  ‹
                </button>
                <button
                  aria-label="Следующий месяц"
                  type="button"
                  onClick={() => setCalendarMonth((currentMonth) => addMonths(currentMonth, 1))}
                >
                  ›
                </button>
              </div>
            </header>

            <div className="channel-calendar-page__weekdays" aria-hidden="true">
              {calendarWeekDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="channel-calendar-page__grid">
              {monthDays.map((day, index) =>
                day === null ? (
                  <span className="channel-calendar-page__empty" key={`empty-${index}`} />
                ) : (
                  <button
                    aria-pressed={isSameCalendarDate(day, selectedDate)}
                    className="channel-calendar-page__day-cell"
                    key={getDateKey(day)}
                    type="button"
                    onClick={() => {
                      if (isOnboardingDemo) {
                        return;
                      }

                      navigate(`/channels/${parsedChannelId}`, {
                        replace: true,
                        state: { selectedDate: getDateKey(day) },
                      });
                    }}
                  >
                    <span
                      className={
                        isSameCalendarDate(day, selectedDate)
                          ? "channel-calendar-page__day channel-calendar-page__day--selected"
                          : "channel-calendar-page__day"
                      }
                    >
                      {day.getDate()}
                      {isSameDate(day, today) && !isSameCalendarDate(day, selectedDate) ? (
                        <TodayStar />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="channel-calendar-page__today-star-spacer"
                        />
                      )}
                    </span>
                    <PlacementDots count={activeCountsByDate[getDateKey(day)] ?? 0} />
                  </button>
                ),
              )}
            </div>
          </section>
        ) : null}
      </PageContent>

      {isCalendarOverlayVisible ? (
        <OnboardingCalendarOverlay onComplete={completeCalendarStep} />
      ) : null}
    </PageLayout>
  );
}

type PlacementDotsProps = {
  count: number;
};

function PlacementDots({ count }: PlacementDotsProps) {
  if (count <= 0) {
    return <span aria-hidden="true" className="channel-calendar-page__dots-spacer" />;
  }

  const visibleCount = Math.min(count, 6);

  return (
    <span aria-hidden="true" className="channel-calendar-page__dots">
      {Array.from({ length: visibleCount }, (_, index) => (
        <span className="channel-calendar-page__dot" key={index} />
      ))}
    </span>
  );
}

function TodayStar() {
  return (
    <svg
      aria-hidden="true"
      className="channel-calendar-page__today-star"
      fill="none"
      height="6"
      viewBox="0 0 6 6"
      width="6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 0.45 3.55 2.05 5.35 2.25 3.95 3.45 4.35 5.2 3 4.35 1.65 5.2 2.05 3.45 0.65 2.25 2.45 2.05 3 0.45Z"
        fill="currentColor"
      />
    </svg>
  );
}
