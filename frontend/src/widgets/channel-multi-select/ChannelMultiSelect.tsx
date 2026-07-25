import type { Channel } from "../../entities/channel/model";
import { ChannelAvatar } from "../../shared/ui/ChannelAvatar/ChannelAvatar";

import "./ChannelMultiSelect.css";

type ChannelMultiSelectProps = {
  channels: Channel[];
  selectedChannelIds: number[];
  onToggle: (channelId: number) => void;
  onToggleAll: () => void;
};

export function ChannelMultiSelect({
  channels,
  selectedChannelIds,
  onToggle,
  onToggleAll,
}: ChannelMultiSelectProps) {
  const hasChannels = channels.length > 0;
  const areAllChannelsSelected =
    hasChannels && selectedChannelIds.length === channels.length;

  if (!hasChannels) {
    return null;
  }

  return (
    <>
      <button
        className="channel-multi-select__select-all"
        type="button"
        onClick={onToggleAll}
      >
        {areAllChannelsSelected ? "Снять выбор" : "Выбрать все"}
      </button>

      <div className="channel-multi-select__list">
        {channels.map((channel) => (
          <ChannelMultiSelectCard
            channel={channel}
            isSelected={selectedChannelIds.includes(channel.id)}
            key={channel.id}
            onToggle={() => onToggle(channel.id)}
          />
        ))}
      </div>
    </>
  );
}

type ChannelMultiSelectCardProps = {
  channel: Channel;
  isSelected: boolean;
  onToggle: () => void;
};

function ChannelMultiSelectCard({
  channel,
  isSelected,
  onToggle,
}: ChannelMultiSelectCardProps) {
  const className = isSelected
    ? "channel-multi-select-card channel-multi-select-card--selected"
    : "channel-multi-select-card";

  return (
    <button className={className} type="button" onClick={onToggle}>
      <ChannelAvatar channel={channel} size="md" />

      <span className="channel-multi-select-card__title">{channel.title}</span>
      <span className="channel-multi-select-card__check" aria-hidden="true">
        {isSelected ? "✓" : ""}
      </span>
    </button>
  );
}
