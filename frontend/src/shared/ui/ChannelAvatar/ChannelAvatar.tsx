import type { Channel } from "../../../entities/channel/model";
import { getMediaUrl } from "../../lib/media";
import { getChannelInitials } from "../../lib/text";

type ChannelAvatarSize = "sm" | "md" | "lg";

type ChannelAvatarProps = {
  channel: Pick<Channel, "title" | "picture">;
  size?: ChannelAvatarSize;
  className?: string;
};

export function ChannelAvatar({ channel, size = "md", className }: ChannelAvatarProps) {
  const pictureUrl = getMediaUrl(channel.picture);
  const sizeClass = `channel-avatar--${size}`;
  const combinedClass = ["channel-avatar", sizeClass, className].filter(Boolean).join(" ");

  if (pictureUrl !== null) {
    return <img alt="" className={combinedClass} src={pictureUrl} />;
  }

  return (
    <div className={`${combinedClass} channel-avatar--fallback`}>
      {getChannelInitials(channel.title)}
    </div>
  );
}
