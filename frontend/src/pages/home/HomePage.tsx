import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useChannels } from "../../features/channels/useChannels";
import { getCalendarChannelList } from "../../features/channels/getCalendarChannelList";
import { useProfile } from "../../features/profile/profileCache";
import { useWeekPlacementCounts } from "../../features/placements/weekDataStore";
import {
  getCurrentWeek,
  getDateKey,
  getHeaderDateLabel,
  getShortDateLabel,
  parseDateKey,
} from "../../shared/lib/date";
import { getDateKeyInTimezone, resolveTimezone } from "../../shared/lib/timezone";
import { getPostsWord } from "../../shared/lib/text";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { Toast, useToast } from "../../shared/ui/Toast";
import { ChannelList } from "../../widgets/channel-list/ChannelList";
import { FloatingActionButton } from "../../widgets/floating-action-button/FloatingActionButton";
import { WeekCalendar } from "../../widgets/week-calendar/WeekCalendar";

type HomePageProps = {
  onCreateChannel: () => void;
  onCreatePlacement: (selectedChannelIds?: number[]) => void;
  onOpenChannel: (channelId: number, selectedDate: string) => void;
};

type HomeLocationState = {
  popupMessage?: string;
  selectedDate?: string;
};

export function HomePage({ onCreateChannel, onCreatePlacement, onOpenChannel }: HomePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as HomeLocationState | null;
  const { user } = useProfile();
  const timezone = resolveTimezone(user?.timezone);
  const today = useMemo(
    () => parseDateKey(getDateKeyInTimezone(new Date(), timezone)) ?? new Date(),
    [timezone],
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const previousTodayKeyRef = useRef(getDateKey(today));
  const { toast, showToast } = useToast();
  const { channels, error: channelsError, isLoading: isChannelsLoading } = useChannels();
  const weekDays = useMemo(() => getCurrentWeek(today).map((date) => ({ date })), [today]);
  const weekDateKeys = useMemo(
    () => weekDays.map((day) => getDateKey(day.date)),
    [weekDays],
  );
  const weekStartDateKey = weekDateKeys[0];
  const weekEndDateKey = weekDateKeys[weekDateKeys.length - 1];
  const selectedDateKey = getDateKey(selectedDate);
  const { countsByChannel: placementCountsByChannel } = useWeekPlacementCounts(
    selectedDateKey,
    weekStartDateKey,
    weekEndDateKey,
  );
  const channelsWithDateCounts = useMemo(
    () =>
      channels
        .map((channel) => ({
          ...channel,
          postsCount: placementCountsByChannel[channel.id] ?? 0,
        }))
        .sort((firstChannel, secondChannel) => {
          if (firstChannel.postsCount === secondChannel.postsCount) {
            return 0;
          }

          return secondChannel.postsCount - firstChannel.postsCount;
        }),
    [channels, placementCountsByChannel],
  );
  const ownedChannels = useMemo(
    () => channelsWithDateCounts.filter((channel) => channel.accessRole === "owner"),
    [channelsWithDateCounts],
  );
  const managedChannels = useMemo(
    () => channelsWithDateCounts.filter((channel) => channel.accessRole === "manager"),
    [channelsWithDateCounts],
  );
  const hasOwnedChannels = ownedChannels.length > 0;
  const hasAnyChannels = channels.length > 0;
  const showOwnedSectionTitle = hasOwnedChannels && managedChannels.length > 0;
  const totalPosts = channelsWithDateCounts.reduce((sum, channel) => sum + channel.postsCount, 0);
  const selectedDateLabel = getShortDateLabel(selectedDate);
  const calendarChannels = useMemo(
    () => getCalendarChannelList(channels, placementCountsByChannel),
    [channels, placementCountsByChannel],
  );

  function handleOpenCalendar() {
    const firstChannel = calendarChannels[0];

    if (firstChannel === undefined) {
      return;
    }

    navigate(`/channels/${firstChannel.id}/calendar`, {
      state: { selectedDate: selectedDateKey, fromHome: true },
    });
  }

  function handleCreatePlacement() {
    if (channels.length === 1) {
      onCreatePlacement([channels[0].id]);
      return;
    }

    onCreatePlacement();
  }

  useEffect(() => {
    const restoredSelectedDate = parseDateKey(locationState?.selectedDate);

    if (restoredSelectedDate !== null) {
      setSelectedDate(restoredSelectedDate);
    }
  }, [locationState?.selectedDate]);

  useEffect(() => {
    const previousTodayKey = previousTodayKeyRef.current;
    const nextTodayKey = getDateKey(today);

    previousTodayKeyRef.current = nextTodayKey;

    if (getDateKey(selectedDate) === previousTodayKey) {
      setSelectedDate(today);
    }
  }, [selectedDate, today]);

  useEffect(() => {
    if (locationState?.popupMessage === undefined) {
      return;
    }

    showToast(locationState.popupMessage);
    navigate("/", { replace: true, state: null });
  }, [locationState?.popupMessage, navigate, showToast]);

  return (
    <PageLayout>
      <section className="home-page__hero page-card page-card--hero">
        <h1 className="home-page__title">
          {getHeaderDateLabel(selectedDate, today)}
          <span>
            {totalPosts} {getPostsWord(totalPosts)}
          </span>
        </h1>

        <WeekCalendar
          days={weekDays}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onOpenMonthCalendar={hasAnyChannels ? handleOpenCalendar : undefined}
        />
      </section>

      <div className="home-page__content page-card page-card--content">
        {hasAnyChannels ? (
          <>
            {hasOwnedChannels ? (
              <ChannelList
                channels={ownedChannels}
                dateLabel={selectedDateLabel}
                error={channelsError}
                isLoading={isChannelsLoading}
                title={showOwnedSectionTitle ? "Мои каналы" : undefined}
                onChannelSelect={(channelId) => onOpenChannel(channelId, selectedDateKey)}
              />
            ) : null}
            {managedChannels.length > 0 ? (
              <ChannelList
                channels={managedChannels}
                dateLabel={selectedDateLabel}
                error={channelsError}
                isLoading={isChannelsLoading}
                title="Менеджерские каналы"
                onChannelSelect={(channelId) => onOpenChannel(channelId, selectedDateKey)}
              />
            ) : null}
          </>
        ) : (
          <ChannelList
            channels={channelsWithDateCounts}
            dateLabel={selectedDateLabel}
            error={channelsError}
            isLoading={isChannelsLoading}
            onChannelSelect={(channelId) => onOpenChannel(channelId, selectedDateKey)}
          />
        )}
      </div>

      <FloatingActionButton
        hasAnyChannels={hasAnyChannels}
        onAddChannel={onCreateChannel}
        onAddPlacement={handleCreatePlacement}
      />

      <Toast state={toast} variant="low" />
    </PageLayout>
  );
}
