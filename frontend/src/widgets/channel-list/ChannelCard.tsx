import type { Channel } from "../../entities/channel/model";
import { ChannelAvatar } from "../../shared/ui/ChannelAvatar/ChannelAvatar";
import { getPlannedPostVerb, getPostsWord } from "../../shared/lib/text";

type ChannelCardProps = {
  channel: Channel;
  dateLabel: string;
  onSelect?: (channelId: number) => void;
};

export function ChannelCard({ channel, dateLabel, onSelect }: ChannelCardProps) {
  const postsText = `${channel.postsCount} ${getPostsWord(channel.postsCount)}`;
  const plannedVerb = getPlannedPostVerb(channel.postsCount);

  return (
    <button
      className="channel-card"
      type="button"
      onClick={() => onSelect?.(channel.id)}
    >
      <ChannelAvatar channel={channel} size="md" />

      <div className="channel-card__content">
        <h2>{channel.title}</h2>
        <p>
          На {dateLabel} {plannedVerb} <span>{postsText}</span>
        </p>
      </div>
    </button>
  );
}
