export type ChannelAccessRole = "owner" | "manager";

export type Channel = {
  id: number;
  title: string;
  link: string;
  picture: string | null;
  postsCount: number;
  accessRole: ChannelAccessRole;
  ownerUsername: string | null;
  ownerFirstName: string | null;
  ownerSubscriptionActive: boolean | null;
};
