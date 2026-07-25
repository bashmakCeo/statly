import type { Channel } from "../../entities/channel/model";
import type { MySubscription } from "./api";

export const SUBSCRIPTION_REQUIRED_MESSAGE =
  "Подписка истекла. Оформите PRO, чтобы продолжить.";

export function isSubscriptionActive(
  subscription: MySubscription["subscription"] | MySubscription["pro_subscription"] | undefined,
) {
  if (subscription === null || subscription === undefined) {
    return false;
  }

  return new Date(subscription.expires_at).getTime() > Date.now();
}

export function hasActiveSubscription(subscriptionState: MySubscription | null | undefined) {
  return isSubscriptionActive(subscriptionState?.subscription);
}

export function canAccessChannel(
  channel: Channel,
  subscriptionState: MySubscription | null | undefined,
) {
  if (channel.accessRole === "owner") {
    return hasActiveSubscription(subscriptionState);
  }

  return channel.ownerSubscriptionActive === true;
}

export function canAccessChannels(
  subscriptionState: MySubscription | null | undefined,
  channels: Channel[],
  channelIds: number[],
) {
  const relevantChannels = channels.filter((channel) => channelIds.includes(channel.id));

  if (relevantChannels.length === 0) {
    return false;
  }

  return relevantChannels.every((channel) => canAccessChannel(channel, subscriptionState));
}

export function hasEffectiveAppAccess(
  subscriptionState: MySubscription | null | undefined,
  channels: Channel[],
) {
  if (channels.length === 0) {
    return hasActiveSubscription(subscriptionState);
  }

  return channels.some((channel) => canAccessChannel(channel, subscriptionState));
}

export function isSubscriptionExpired(subscriptionState: MySubscription | null | undefined) {
  if (subscriptionState === null || subscriptionState === undefined) {
    return false;
  }

  if (hasActiveSubscription(subscriptionState)) {
    return false;
  }

  return subscriptionState.free_trial !== null;
}

export function isEffectiveSubscriptionExpired(
  subscriptionState: MySubscription | null | undefined,
  channels: Channel[],
) {
  if (hasEffectiveAppAccess(subscriptionState, channels)) {
    return false;
  }

  const ownedChannels = channels.filter((channel) => channel.accessRole === "owner");
  const managedChannels = channels.filter((channel) => channel.accessRole === "manager");

  if (ownedChannels.length === 0 && managedChannels.length > 0) {
    return getBlockedManagerChannels(subscriptionState, channels).length > 0;
  }

  if (channels.length > 0) {
    return true;
  }

  return isSubscriptionExpired(subscriptionState);
}

export function getChannelOwnerLabel(channel: Channel) {
  if (channel.ownerUsername !== null && channel.ownerUsername.trim() !== "") {
    return `@${channel.ownerUsername}`;
  }

  if (channel.ownerFirstName !== null && channel.ownerFirstName.trim() !== "") {
    return channel.ownerFirstName.trim();
  }

  return "владельца";
}

function formatOwnerLabels(channels: Channel[]) {
  const labels = [...new Set(channels.map(getChannelOwnerLabel))];

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} и ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")} и ${labels[labels.length - 1]}`;
}

function getBlockedManagerChannels(
  subscriptionState: MySubscription | null | undefined,
  channels: Channel[],
  channelIds?: number[],
) {
  const scope =
    channelIds !== undefined && channelIds.length > 0
      ? channels.filter((channel) => channelIds.includes(channel.id))
      : channels;

  return scope.filter(
    (channel) =>
      channel.accessRole === "manager" && !canAccessChannel(channel, subscriptionState),
  );
}

function getBlockedOwnedChannels(
  subscriptionState: MySubscription | null | undefined,
  channels: Channel[],
  channelIds?: number[],
) {
  const scope =
    channelIds !== undefined && channelIds.length > 0
      ? channels.filter((channel) => channelIds.includes(channel.id))
      : channels;

  return scope.filter(
    (channel) => channel.accessRole === "owner" && !canAccessChannel(channel, subscriptionState),
  );
}

export type SubscriptionRequiredOverlayContext =
  | { variant: "own" }
  | { variant: "owner"; ownerLabel: string };

export function resolveRequiredOverlayContext(
  subscriptionState: MySubscription | null | undefined,
  channels: Channel[],
  options?: { channelIds?: number[]; requireOwnSubscription?: boolean },
): SubscriptionRequiredOverlayContext {
  if (options?.requireOwnSubscription) {
    return { variant: "own" };
  }

  const blockedManagerChannels = getBlockedManagerChannels(
    subscriptionState,
    channels,
    options?.channelIds,
  );
  const blockedOwnedChannels = getBlockedOwnedChannels(
    subscriptionState,
    channels,
    options?.channelIds,
  );

  if (blockedManagerChannels.length > 0 && blockedOwnedChannels.length === 0) {
    return {
      variant: "owner",
      ownerLabel: formatOwnerLabels(blockedManagerChannels),
    };
  }

  return { variant: "own" };
}

export function getOwnerSubscriptionExpiredMessage(ownerLabel: string) {
  const isMultiple = ownerLabel.includes(" и ") || ownerLabel.includes(",");

  if (isMultiple) {
    return `У владельцев ${ownerLabel} истекла подписка. Чтобы продолжить работу, им нужно продлить подписку.`;
  }

  if (ownerLabel.startsWith("@")) {
    return `У ${ownerLabel} истекла подписка. Чтобы продолжить работу, ему нужно продлить подписку.`;
  }

  return `У владельца ${ownerLabel} истекла подписка. Чтобы продолжить работу, ему нужно продлить подписку.`;
}

export function formatSubscriptionDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatFreeTrialPeriodLabel(days: number) {
  if (days % 7 === 0 && days >= 7) {
    const weeks = days / 7;
    if (weeks === 1) {
      return "1 неделя без ограничений";
    }

    if (weeks >= 2 && weeks <= 4) {
      return `${weeks} недели без ограничений`;
    }

    return `${weeks} недель без ограничений`;
  }

  if (days === 1) {
    return "1 день без ограничений";
  }

  if (days >= 2 && days <= 4) {
    return `${days} дня без ограничений`;
  }

  return `${days} дней без ограничений`;
}

export function getProfileSubscriptionLabel(
  freeTrial: MySubscription["free_trial"],
  proSubscription: MySubscription["pro_subscription"],
) {
  if (isSubscriptionActive(proSubscription)) {
    return "PRO";
  }

  if (isSubscriptionActive(freeTrial)) {
    return "Free";
  }

  if (freeTrial !== null && freeTrial !== undefined) {
    return "Истекла";
  }

  return "Free";
}

export function getChannelBonusSuccessMessage(days: number) {
  return `Вам начислено ${days} ${getDaysWord(days)} доступа за подписку на канал`;
}

function getDaysWord(days: number) {
  if (days % 10 === 1 && days % 100 !== 11) {
    return "день";
  }

  if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) {
    return "дня";
  }

  return "дней";
}

export function getFreeTrialDescription(
  freeTrial: MySubscription["free_trial"],
  isProActive: boolean,
) {
  if (freeTrial === null || freeTrial === undefined) {
    return "Пробный период недоступен";
  }

  if (isSubscriptionActive(freeTrial)) {
    return `Пробуйте все функции — бесплатно до ${formatSubscriptionDate(freeTrial.expires_at)}`;
  }

  if (!isProActive) {
    return "Пробный период закончился. Оформите PRO, чтобы продолжить.";
  }

  return `Пробный период был до ${formatSubscriptionDate(freeTrial.expires_at)}`;
}
