import type { Channel } from "../../entities/channel/model";

export function getCalendarChannelList(
  channels: Channel[],
  postsCountByChannelId: Record<number, number> = {},
) {
  const channelsWithCounts = channels
    .map((channel) => ({
      ...channel,
      postsCount: postsCountByChannelId[channel.id] ?? 0,
    }))
    .sort((firstChannel, secondChannel) => {
      if (secondChannel.postsCount === firstChannel.postsCount) {
        return 0;
      }

      return secondChannel.postsCount - firstChannel.postsCount;
    });

  const ownedChannels = channelsWithCounts.filter((channel) => channel.accessRole === "owner");
  const managedChannels = channelsWithCounts.filter((channel) => channel.accessRole === "manager");

  if (ownedChannels.length > 0 && managedChannels.length > 0) {
    return [...ownedChannels, ...managedChannels];
  }

  return channelsWithCounts;
}
