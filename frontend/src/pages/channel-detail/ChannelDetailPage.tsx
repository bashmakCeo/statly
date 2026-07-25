import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { useChannels } from "../../features/channels/useChannels";
import { useProfile } from "../../features/profile/profileCache";
import { useSubscriptionAccess } from "../../features/subscription/SubscriptionAccessContext";
import { removeChannelFromCache } from "../../features/channels/channelsCache";
import { leaveManagedChannel } from "../../features/channel-managers/api";
import type { Channel } from "../../entities/channel/model";
import { useChannelWeekPlacements } from "../../features/placements/weekDataStore";
import calendarIcon from "../../shared/assets/icons/calendar.svg";
import {
  getChannelPlacementsEmptyLabel,
  getCurrentWeek,
  getDateKey,
  parseDateKey,
} from "../../shared/lib/date";
import { getDateKeyInTimezone, resolveTimezone } from "../../shared/lib/timezone";
import { ChannelAvatar } from "../../shared/ui/ChannelAvatar/ChannelAvatar";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { Toast, useToast } from "../../shared/ui/Toast";
import { ChannelListSkeleton } from "../../widgets/channel-list/ChannelListSkeleton";
import { FloatingActionButton } from "../../widgets/floating-action-button/FloatingActionButton";
import { PlacementList } from "../../widgets/placement-list/PlacementList";
import { WeekCalendar } from "../../widgets/week-calendar/WeekCalendar";

type ChannelDetailPageProps = {
  onBack: () => void;
  onCreatePlacement: (channelId: number) => void;
  onEditChannel: (channelId: number) => void;
};

type ChannelDetailLocationState = {
  popupMessage?: string;
  selectedDate?: string;
};

export function ChannelDetailPage({
  onBack,
  onCreatePlacement,
  onEditChannel,
}: ChannelDetailPageProps) {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as ChannelDetailLocationState | null;
  const parsedChannelId = Number(channelId);
  const { user } = useProfile();
  const { guardAction } = useSubscriptionAccess();
  const timezone = resolveTimezone(user?.timezone);
  const today = useMemo(
    () => parseDateKey(getDateKeyInTimezone(new Date(), timezone)) ?? new Date(),
    [timezone],
  );
  const initialDate = parseDateKey(locationState?.selectedDate) ?? today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { toast, showToast } = useToast();
  const { channels, error, isLoading } = useChannels();
  const channel = channels.find((item) => item.id === parsedChannelId);
  const weekDays = useMemo(
    () => getCurrentWeek(selectedDate).map((date) => ({ date })),
    [selectedDate],
  );
  const weekDateKeys = useMemo(
    () => weekDays.map((day) => getDateKey(day.date)),
    [weekDays],
  );
  const weekStartDateKey = weekDateKeys[0];
  const weekEndDateKey = weekDateKeys[weekDateKeys.length - 1];
  const selectedDateKey = getDateKey(selectedDate);
  const {
    placements,
    error: placementsError,
    isLoading: isPlacementsLoading,
  } = useChannelWeekPlacements(
    parsedChannelId,
    selectedDateKey,
    weekStartDateKey,
    weekEndDateKey,
  );

  useEffect(() => {
    const nextDate = parseDateKey(locationState?.selectedDate);

    if (nextDate !== null) {
      setSelectedDate(nextDate);
    }
  }, [location.key, locationState?.selectedDate]);

  useEffect(() => {
    if (locationState?.popupMessage === undefined) {
      return;
    }

    showToast(locationState.popupMessage);
    navigate(location.pathname, {
      replace: true,
      state: {
        selectedDate: locationState.selectedDate,
      },
    });
  }, [location.pathname, locationState?.popupMessage, locationState?.selectedDate, navigate, showToast]);

  async function handleLeaveChannel() {
    if (isLeaving) {
      return;
    }

    try {
      setIsLeaving(true);
      await leaveManagedChannel(parsedChannelId);
      removeChannelFromCache(parsedChannelId);
      navigate("/", { replace: true });
    } catch (leaveError: unknown) {
      console.error("Leave managed channel failed", leaveError);
      setIsLeaveModalOpen(false);
    } finally {
      setIsLeaving(false);
    }
  }

  if (Number.isNaN(parsedChannelId)) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageLayout>
      <PageHeader className="channel-detail-page__header">
        <div className="page-header__nav-row">
          <button className="nav-button nav-button--back" type="button" onClick={onBack}>
            Назад
          </button>
          {channel?.accessRole === "owner" ? (
            <button
              className="nav-button"
              disabled={channel === undefined}
              type="button"
              onClick={() => onEditChannel(parsedChannelId)}
            >
              Изменить
            </button>
          ) : channel?.accessRole === "manager" ? (
            <button
              className="nav-button nav-button--danger"
              disabled={channel === undefined}
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
            >
              Покинуть
            </button>
          ) : (
            <span aria-hidden="true" className="nav-button nav-button--spacer" />
          )}
        </div>

        {isLoading ? <ChannelListSkeleton rows={1} /> : null}
        {error !== null ? <StateMessage variant="error">{error}</StateMessage> : null}
        {!isLoading && error === null && channel !== undefined ? (
          <>
            <div className="channel-detail-page__profile">
              <ChannelAvatar channel={channel} className="channel-detail-page__avatar" size="lg" />
              <div className="channel-detail-page__title-row">
                <span aria-hidden="true" className="channel-detail-page__title-spacer" />
                <h1>{channel.title}</h1>
                <button
                  className="channel-detail-page__calendar"
                  type="button"
                  aria-label="Календарь"
                  onClick={() => {
                    navigate(`/channels/${parsedChannelId}/calendar`, {
                      state: { selectedDate: selectedDateKey },
                    });
                  }}
                >
                  <img alt="" src={calendarIcon} />
                </button>
              </div>
            </div>

            <WeekCalendar
              days={weekDays}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </>
        ) : null}
      </PageHeader>

      <PageContent ariaLabel="Размещения канала" className="channel-detail-page__content">
        {!isLoading && error === null && channel === undefined ? (
          <StateMessage>Канал не найден</StateMessage>
        ) : null}
        {isPlacementsLoading ? <ChannelListSkeleton rows={2} /> : null}
        {placementsError !== null ? <StateMessage variant="error">{placementsError}</StateMessage> : null}
        {!isLoading && error === null && channel !== undefined && !isPlacementsLoading && placementsError === null ? (
          <PlacementList
            emptyLabel={getChannelPlacementsEmptyLabel(selectedDate)}
            placements={placements}
            onEditPlacement={(placement) => {
              guardAction(
                () => {
                  navigate(`/placements/${placement.id}/edit`, {
                    state: {
                      channelId: parsedChannelId,
                      selectedDate: selectedDateKey,
                    },
                  });
                },
                { channelIds: [parsedChannelId] },
              );
            }}
          />
        ) : null}
      </PageContent>

      {channel !== undefined ? (
        <FloatingActionButton
          canAddChannel={false}
          onAddPlacement={() => onCreatePlacement(parsedChannelId)}
        />
      ) : null}

      <Toast state={toast} />

      {isLeaveModalOpen && channel !== undefined ? (
        <ConfirmDialog
          title="Покинуть канал?"
          description={getLeaveChannelMessage(channel)}
          confirmLabel="Покинуть"
          processingLabel="..."
          isProcessing={isLeaving}
          wide
          onCancel={() => setIsLeaveModalOpen(false)}
          onConfirm={() => void handleLeaveChannel()}
        />
      ) : null}
    </PageLayout>
  );
}

function getLeaveChannelMessage(channel: Channel) {
  const ownerLabel = getChannelOwnerLabel(channel);

  if (ownerLabel === null) {
    return "Вы уверены, что хотите покинуть канал?";
  }

  return `Вы уверены, что хотите покинуть канал пользователя ${ownerLabel}?`;
}

function getChannelOwnerLabel(channel: Channel) {
  if (channel.ownerUsername !== null && channel.ownerUsername.trim() !== "") {
    return `@${channel.ownerUsername}`;
  }

  if (channel.ownerFirstName !== null && channel.ownerFirstName.trim() !== "") {
    return channel.ownerFirstName.trim();
  }

  return null;
}
