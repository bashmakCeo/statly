import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useChannels } from "../channels/useChannels";
import { Toast, useToast } from "../../shared/ui/Toast";
import { SubscriptionRequiredOverlay } from "../../widgets/subscription/SubscriptionRequiredOverlay";
import { loadProfileCache, useProfile } from "../profile/profileCache";
import { claimChannelBonus } from "./api";
import {
  canAccessChannels,
  getChannelBonusSuccessMessage,
  hasActiveSubscription,
  hasEffectiveAppAccess,
  resolveRequiredOverlayContext,
  type SubscriptionRequiredOverlayContext,
} from "./subscriptionUtils";
import {
  getSubscriptionApiErrorMessage,
  isSubscriptionRequiredApiError,
  SUBSCRIPTION_REQUIRED_MESSAGE,
} from "./subscriptionAccess";

export type GuardActionOptions = {
  channelIds?: number[];
  requireOwnSubscription?: boolean;
};

type SubscriptionAccessContextValue = {
  guardAction: (action: () => void, options?: GuardActionOptions) => void;
  handleMutationError: (
    error: unknown,
    fallbackMessage: string,
    notify: (message: string) => void,
    options?: GuardActionOptions,
  ) => void;
  hasActiveSubscription: boolean;
  hasEffectiveAppAccess: boolean;
  isSubscriptionExpired: boolean;
  requestSubscription: (options?: GuardActionOptions) => boolean;
  showSubscriptionRequired: (options?: GuardActionOptions) => void;
  subscriptionRequiredMessage: typeof SUBSCRIPTION_REQUIRED_MESSAGE;
};

const SubscriptionAccessContext = createContext<SubscriptionAccessContextValue | null>(null);

export function SubscriptionAccessProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { hasActiveSubscription: isActive, isSubscriptionExpired, subscriptionState } = useProfile();
  const { channels, isLoading: isChannelsLoading } = useChannels();
  const [overlayContext, setOverlayContext] = useState<SubscriptionRequiredOverlayContext>({
    variant: "own",
  });
  const [isRequiredVisible, setIsRequiredVisible] = useState(false);
  const [isClaimingChannelBonus, setIsClaimingChannelBonus] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const effectiveAppAccess = hasEffectiveAppAccess(subscriptionState, channels);

  const showSubscriptionRequired = useCallback(
    (options?: GuardActionOptions) => {
      setClaimError(null);
      setOverlayContext(resolveRequiredOverlayContext(subscriptionState, channels, options));
      setIsRequiredVisible(true);
    },
    [channels, subscriptionState],
  );

  const requestSubscription = useCallback(
    (options?: GuardActionOptions) => {
      if (options?.requireOwnSubscription) {
        if (hasActiveSubscription(subscriptionState)) {
          return true;
        }

        showSubscriptionRequired(options);
        return false;
      }

      if (options?.channelIds !== undefined && options.channelIds.length > 0) {
        if (canAccessChannels(subscriptionState, channels, options.channelIds)) {
          return true;
        }

        showSubscriptionRequired(options);
        return false;
      }

      if (hasEffectiveAppAccess(subscriptionState, channels)) {
        return true;
      }

      showSubscriptionRequired(options);
      return false;
    },
    [channels, showSubscriptionRequired, subscriptionState],
  );

  const guardAction = useCallback(
    (action: () => void, options?: GuardActionOptions) => {
      if (requestSubscription(options)) {
        action();
      }
    },
    [requestSubscription],
  );

  const handleMutationError = useCallback(
    (
      error: unknown,
      fallbackMessage: string,
      notify: (message: string) => void,
      options?: GuardActionOptions,
    ) => {
      if (isSubscriptionRequiredApiError(error)) {
        showSubscriptionRequired(options);
        return;
      }

      notify(fallbackMessage);
    },
    [showSubscriptionRequired],
  );

  function dismissRequiredOverlay() {
    setClaimError(null);
    setIsRequiredVisible(false);
  }

  function goToSubscription() {
    dismissRequiredOverlay();
    navigate("/profile/subscription");
  }

  async function handleClaimChannelBonus() {
    if (isClaimingChannelBonus) {
      return;
    }

    try {
      setIsClaimingChannelBonus(true);
      setClaimError(null);
      const subscriptionState = await claimChannelBonus();
      await loadProfileCache(true);
      dismissRequiredOverlay();
      showToast(
        getChannelBonusSuccessMessage(subscriptionState.channel_bonus.bonus_days),
      );
    } catch (error) {
      console.error("Channel bonus claim failed", error);
      setClaimError(getSubscriptionApiErrorMessage(error, "Не удалось получить бонус"));
    } finally {
      setIsClaimingChannelBonus(false);
    }
  }

  return (
    <SubscriptionAccessContext.Provider
      value={{
        guardAction,
        handleMutationError,
        hasActiveSubscription: isActive,
        hasEffectiveAppAccess: !isChannelsLoading && effectiveAppAccess,
        isSubscriptionExpired,
        requestSubscription,
        showSubscriptionRequired,
        subscriptionRequiredMessage: SUBSCRIPTION_REQUIRED_MESSAGE,
      }}
    >
      {children}
      {isRequiredVisible ? (
        <SubscriptionRequiredOverlay
          channelBonus={subscriptionState?.channel_bonus ?? null}
          claimError={claimError}
          context={overlayContext}
          isClaimingChannelBonus={isClaimingChannelBonus}
          onClaimChannelBonus={() => {
            void handleClaimChannelBonus();
          }}
          onDismiss={dismissRequiredOverlay}
          onSubscribe={goToSubscription}
        />
      ) : null}
      <Toast state={toast} variant="muted" />
    </SubscriptionAccessContext.Provider>
  );
}

export function useSubscriptionAccess() {
  const context = useContext(SubscriptionAccessContext);

  if (context === null) {
    throw new Error("useSubscriptionAccess must be used within SubscriptionAccessProvider");
  }

  return context;
}
