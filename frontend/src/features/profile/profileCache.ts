import { useEffect, useSyncExternalStore } from "react";

import { getCurrentUser } from "../auth/api";
import { getMySubscription, type MySubscription } from "../subscription/api";
import {
  getProfileSubscriptionLabel,
  hasActiveSubscription,
  isSubscriptionExpired,
} from "../subscription/subscriptionUtils";
import { getTimezoneOptions, type TimezoneOption } from "./api";

type ProfileUser = Awaited<ReturnType<typeof getCurrentUser>>;

type ProfileCacheSnapshot = {
  error: string | null;
  hasActiveSubscription: boolean;
  hasLoaded: boolean;
  isSubscriptionExpired: boolean;
  subscriptionLabel: string;
  subscriptionState: MySubscription | null;
  timezoneOptions: TimezoneOption[];
  user: ProfileUser | null;
};

let user: ProfileUser | null = null;
let subscriptionState: MySubscription | null = null;
let subscriptionLabel = "Free";
let hasActiveSubscriptionValue = false;
let isSubscriptionExpiredValue = false;
let timezoneOptions: TimezoneOption[] = [];
let error: string | null = null;
let hasLoaded = false;
let loadPromise: Promise<void> | null = null;

let snapshot: ProfileCacheSnapshot = {
  error: null,
  hasActiveSubscription: false,
  hasLoaded: false,
  isSubscriptionExpired: false,
  subscriptionLabel: "Free",
  subscriptionState: null,
  timezoneOptions: [],
  user: null,
};

const listeners = new Set<() => void>();

function publishSnapshot() {
  snapshot = {
    error,
    hasActiveSubscription: hasActiveSubscriptionValue,
    hasLoaded,
    isSubscriptionExpired: isSubscriptionExpiredValue,
    subscriptionLabel,
    subscriptionState,
    timezoneOptions,
    user,
  };
}

function emit() {
  publishSnapshot();
  listeners.forEach((listener) => listener());
}

function resolveSubscriptionLabel(
  nextSubscriptionState: MySubscription | null,
) {
  if (nextSubscriptionState === null) {
    return "Free";
  }

  return getProfileSubscriptionLabel(
    nextSubscriptionState.free_trial,
    nextSubscriptionState.pro_subscription,
  );
}

function applySubscriptionState(nextSubscriptionState: MySubscription | null) {
  subscriptionState = nextSubscriptionState;
  subscriptionLabel = resolveSubscriptionLabel(nextSubscriptionState);
  hasActiveSubscriptionValue = hasActiveSubscription(nextSubscriptionState);
  isSubscriptionExpiredValue = isSubscriptionExpired(nextSubscriptionState);
}

export function subscribeProfileCache(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getProfileCacheSnapshot() {
  return snapshot;
}

export function seedProfileUser(nextUser: ProfileUser) {
  user = nextUser;
  emit();
}

export function updateProfileUser(nextUser: ProfileUser) {
  user = nextUser;
  emit();
}

export async function loadProfileCache(force = false) {
  if (hasLoaded && !force) {
    return;
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const [loadedUser, loadedSubscriptionState, timezoneResponse] = await Promise.all([
        getCurrentUser(),
        getMySubscription().catch((subscriptionError: unknown) => {
          console.error("Subscription state loading failed", subscriptionError);
          return null;
        }),
        // Список TZ грузим вместе с профилем — чтобы в настройках сразу был label, а не «Выберите…».
        getTimezoneOptions().catch((timezoneError: unknown) => {
          console.error("Timezone options loading failed", timezoneError);
          return { default_timezone: "Europe/Moscow", options: [] };
        }),
      ]);

      user = loadedUser;
      applySubscriptionState(loadedSubscriptionState);
      timezoneOptions = timezoneResponse.options;
      error = null;
      hasLoaded = true;
    } catch (loadError: unknown) {
      console.error("Profile loading failed", loadError);
      user = null;
      applySubscriptionState(null);
      timezoneOptions = [];
      error = "Не удалось загрузить профиль";
      hasLoaded = true;
    } finally {
      loadPromise = null;
      emit();
    }
  })();

  return loadPromise;
}

export function useProfile() {
  const cacheSnapshot = useSyncExternalStore(
    subscribeProfileCache,
    getProfileCacheSnapshot,
    getProfileCacheSnapshot,
  );

  useEffect(() => {
    void loadProfileCache();
  }, []);

  return {
    error: cacheSnapshot.error,
    hasActiveSubscription: cacheSnapshot.hasActiveSubscription,
    hasLoaded: cacheSnapshot.hasLoaded,
    isLoading: !cacheSnapshot.hasLoaded && cacheSnapshot.user === null,
    isSubscriptionExpired: cacheSnapshot.isSubscriptionExpired,
    subscriptionLabel: cacheSnapshot.subscriptionLabel,
    subscriptionState: cacheSnapshot.subscriptionState,
    timezoneOptions: cacheSnapshot.timezoneOptions,
    user: cacheSnapshot.user,
  };
}

export type { ProfileUser, TimezoneOption };
