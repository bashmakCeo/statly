import { useEffect, useRef } from "react";

import { useChannels } from "../channels/useChannels";
import { useProfile } from "../profile/profileCache";
import { isEffectiveSubscriptionExpired } from "./subscriptionUtils";

type UseSubscriptionExpiredNoticeOptions = {
  isWelcomeVisible: boolean;
  showSubscriptionRequired: () => void;
};

export function useSubscriptionExpiredNotice({
  isWelcomeVisible,
  showSubscriptionRequired,
}: UseSubscriptionExpiredNoticeOptions) {
  const { hasLoaded, subscriptionState } = useProfile();
  const { channels, isLoading: isChannelsLoading } = useChannels();
  const hasShownEntryNoticeRef = useRef(false);

  useEffect(() => {
    if (
      !hasLoaded
      || isChannelsLoading
      || isWelcomeVisible
      || hasShownEntryNoticeRef.current
    ) {
      return;
    }

    if (!isEffectiveSubscriptionExpired(subscriptionState, channels)) {
      return;
    }

    hasShownEntryNoticeRef.current = true;
    showSubscriptionRequired();
  }, [
    channels,
    hasLoaded,
    isChannelsLoading,
    isWelcomeVisible,
    showSubscriptionRequired,
    subscriptionState,
  ]);
}
