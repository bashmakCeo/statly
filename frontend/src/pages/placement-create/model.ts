export type PlacementForm = {
  campaignName: string;
  date: string;
  time: string;
  format: string;
  advertiserContact: string;
  price: string;
  comment: string;
};

export type PriceMode = "total" | "perChannel";

export const initialPlacementForm: PlacementForm = {
  advertiserContact: "",
  campaignName: "",
  comment: "",
  date: "",
  format: "",
  price: "",
  time: "",
};
