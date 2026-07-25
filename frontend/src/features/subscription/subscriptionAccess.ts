import {
  SUBSCRIPTION_REQUIRED_MESSAGE,
  hasActiveSubscription,
} from "./subscriptionUtils";
import type { MySubscription } from "./api";

export { SUBSCRIPTION_REQUIRED_MESSAGE };

export function guardSubscriptionAction(
  subscriptionState: MySubscription | null | undefined,
  action: () => void,
  notify: (message: string) => void,
): boolean {
  if (hasActiveSubscription(subscriptionState)) {
    action();
    return true;
  }

  notify(SUBSCRIPTION_REQUIRED_MESSAGE);
  return false;
}

export function isSubscriptionRequiredApiError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("403") && error.message.includes("Подписка");
}

export function getMutationErrorMessage(error: unknown, fallbackMessage: string) {
  if (isSubscriptionRequiredApiError(error)) {
    return SUBSCRIPTION_REQUIRED_MESSAGE;
  }

  return fallbackMessage;
}

export function getSubscriptionApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const detailMatch = error.message.match(/"detail"\s*:\s*"([^"]+)"/);
  if (detailMatch?.[1]) {
    return detailMatch[1];
  }

  if (error.message.includes("Подпишитесь на канал")) {
    return "Подпишитесь на канал, чтобы получить бонус";
  }

  return fallbackMessage;
}
