import type { Channel } from "../../../entities/channel/model";
import { ChannelAvatar } from "../../../shared/ui/ChannelAvatar/ChannelAvatar";
import { getSelectedChannelsTitle } from "../placementCreateUtils";

type SelectedChannelsHeaderProps = {
  channels: Channel[];
};

export function SelectedChannelsHeader({ channels }: SelectedChannelsHeaderProps) {
  return (
    <div className="placement-create-page__selected">
      <div className="placement-create-page__avatars" aria-hidden="true">
        {channels.slice(0, 3).map((channel) => (
          <ChannelAvatar
            channel={channel}
            className="placement-create-page__avatar"
            key={channel.id}
            size="lg"
          />
        ))}
      </div>
      <h1>{getSelectedChannelsTitle(channels)}</h1>
    </div>
  );
}
