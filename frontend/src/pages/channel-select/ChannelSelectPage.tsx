import { useState } from "react";
import { useLocation } from "react-router-dom";

import { useChannels } from "../../features/channels/useChannels";
import { CHANNEL_TEXTS } from "../../shared/config/app";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { ChannelMultiSelect } from "../../widgets/channel-multi-select/ChannelMultiSelect";
import { ChannelListSkeleton } from "../../widgets/channel-list/ChannelListSkeleton";

type ChannelSelectLocationState = {
  selectedChannelIds?: number[];
};

type ChannelSelectPageProps = {
  onBack: () => void;
  onComplete: (selectedChannelIds: number[]) => void;
};

export function ChannelSelectPage({ onBack, onComplete }: ChannelSelectPageProps) {
  const location = useLocation();
  const initialSelectedChannelIds =
    (location.state as ChannelSelectLocationState | null)?.selectedChannelIds ?? [];
  const { channels, error, isLoading } = useChannels();
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>(
    initialSelectedChannelIds,
  );
  const hasSelectedChannels = selectedChannelIds.length > 0;
  const areAllChannelsSelected =
    channels.length > 0 && selectedChannelIds.length === channels.length;

  function handleToggleChannel(channelId: number) {
    setSelectedChannelIds((currentIds) =>
      currentIds.includes(channelId)
        ? currentIds.filter((id) => id !== channelId)
        : [...currentIds, channelId],
    );
  }

  function handleComplete() {
    if (hasSelectedChannels) {
      onComplete(selectedChannelIds);
    }
  }

  function handleToggleAllChannels() {
    setSelectedChannelIds(
      areAllChannelsSelected ? [] : channels.map((channel) => channel.id),
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="page-header__title-row">
          <button className="nav-button nav-button--back" type="button" onClick={onBack}>
            Отмена
          </button>

          <h1 className="page-header__title">Выбор каналов</h1>

          <button
            className="nav-button"
            disabled={!hasSelectedChannels}
            type="button"
            onClick={handleComplete}
          >
            Готово
          </button>
        </div>
      </PageHeader>

      <PageContent ariaLabel="Выбор каналов">
        {isLoading ? <ChannelListSkeleton rows={4} /> : null}
        {error !== null ? <StateMessage variant="error">{error}</StateMessage> : null}
        {!isLoading && error === null && channels.length === 0 ? (
          <StateMessage>{CHANNEL_TEXTS.empty}</StateMessage>
        ) : null}

        {!isLoading && error === null && channels.length > 0 ? (
          <ChannelMultiSelect
            channels={channels}
            selectedChannelIds={selectedChannelIds}
            onToggle={handleToggleChannel}
            onToggleAll={handleToggleAllChannels}
          />
        ) : null}
      </PageContent>
    </PageLayout>
  );
}
