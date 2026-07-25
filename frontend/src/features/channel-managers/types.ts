import type { ChannelManager } from "./api";

export type ManagerListItem = ChannelManager & {
  channelTitle: string;
};

export type GroupedManager = {
  username: string;
  firstName: string | null;
  photoUrl: string | null;
  assignments: { id: number; channelId: number; channelTitle: string }[];
};
