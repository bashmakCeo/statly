export type PlacementStatus = "paid" | "unpaid";

export type Placement = {
  id: number;
  channelId: number;
  buyerName: string;
  buyerContact: string | null;
  comment: string | null;
  format: string;
  price: string;
  publishDateUtc: string;
  publishTimeUtc: string | null;
  status: PlacementStatus;
};
