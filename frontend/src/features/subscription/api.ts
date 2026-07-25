import { apiRequest } from "../../shared/api/client";

export type SubscriptionPaymentMethod = "telegram_stars" | "crypto_bot";

export type SubscriptionPlan = {
  price_rub: number;
  price_label: string;
  stars_amount: number;
};

export type UserSubscription = {
  id: number;
  plan: string;
  started_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPayment = {
  id: number;
  subscription_id: number | null;
  provider: SubscriptionPaymentMethod;
  invoice_url: string | null;
  amount_rub: number;
  stars_amount: number | null;
  status: "pending" | "paid" | "failed" | "expired";
  payload: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChannelBonus = {
  eligible: boolean;
  claimed: boolean;
  channel_url: string;
  channel_title: string;
  bonus_days: number;
  is_subscribed: boolean;
};

export type MySubscription = {
  plan: SubscriptionPlan;
  subscription: UserSubscription | null;
  free_trial: UserSubscription | null;
  pro_subscription: UserSubscription | null;
  free_trial_days: number;
  channel_bonus: ChannelBonus;
  payments: SubscriptionPayment[];
};

export type SubscriptionInvoice = {
  payment_id: number | null;
  method: SubscriptionPaymentMethod;
  price_rub: number;
  price_label: string;
  invoice_url: string | null;
  is_stub: boolean;
  message?: string | null;
};

export function getSubscriptionPlan() {
  return apiRequest<SubscriptionPlan>("/api/subscription");
}

export function getMySubscription() {
  return apiRequest<MySubscription>("/api/subscription/me");
}

export function createSubscriptionInvoice(method: SubscriptionPaymentMethod) {
  return apiRequest<SubscriptionInvoice>("/api/subscription/invoices", {
    method: "POST",
    body: JSON.stringify({ method }),
  });
}

export function claimChannelBonus() {
  return apiRequest<MySubscription>("/api/subscription/channel-bonus/claim", {
    method: "POST",
  });
}
