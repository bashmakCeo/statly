import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useProfile } from "../profile/profileCache";
import {
  getOnboardingCalendarPath,
  isOnboardingCalendarPath,
} from "./onboardingCalendarMock";
import {
  hasCompletedOnboarding,
  hasSeenCalendarStep,
  hasSeenWelcomeStep,
  markCalendarStepSeen,
  markOnboardingComplete,
  markWelcomeStepSeen,
} from "./onboardingStorage";

const listeners = new Set<() => void>();
let calendarOverlayDismissed = false;
let analyticsOverlayDismissed = false;

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notifyOnboardingListeners() {
  listeners.forEach((listener) => listener());
}

function resetCalendarOnboardingSession() {
  calendarOverlayDismissed = false;
  notifyOnboardingListeners();
}

function resetAnalyticsOnboardingSession() {
  analyticsOverlayDismissed = false;
  notifyOnboardingListeners();
}

export function useOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useProfile();
  const previousPathRef = useRef(location.pathname);
  const [, setSessionVersion] = useState(0);

  useEffect(() => subscribe(() => setSessionVersion((version) => version + 1)), []);

  const isComplete = user !== null && hasCompletedOnboarding(user.telegram_id);
  const hasSeenWelcome = user !== null && hasSeenWelcomeStep(user.telegram_id);
  const hasSeenCalendar = user !== null && hasSeenCalendarStep(user.telegram_id);
  const isWelcomeVisible = user !== null && location.pathname === "/" && !hasSeenWelcome;
  const isCalendarOnboardingPending =
    user !== null && hasSeenWelcome && !hasSeenCalendar && !isComplete;
  const isCalendarDemoActive =
    user !== null &&
    isOnboardingCalendarPath(location.pathname) &&
    isCalendarOnboardingPending;
  const isCalendarOverlayVisible = isCalendarDemoActive && !calendarOverlayDismissed;
  const isAnalyticsDemoActive =
    user !== null && location.pathname === "/analytics" && hasSeenCalendar && !isComplete;
  const isAnalyticsOverlayVisible = isAnalyticsDemoActive && !analyticsOverlayDismissed;

  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;

    if (user === null) {
      return;
    }

    const onboardingCalendarPath = getOnboardingCalendarPath();

    if (
      previousPath === onboardingCalendarPath &&
      location.pathname !== onboardingCalendarPath &&
      hasSeenWelcomeStep(user.telegram_id) &&
      !hasSeenCalendarStep(user.telegram_id) &&
      !hasCompletedOnboarding(user.telegram_id)
    ) {
      markCalendarStepSeen(user.telegram_id);
      resetAnalyticsOnboardingSession();

      if (location.pathname !== "/analytics") {
        navigate("/analytics");
      }
    }

    if (
      previousPath === "/analytics" &&
      location.pathname !== "/analytics" &&
      hasSeenCalendarStep(user.telegram_id) &&
      !hasCompletedOnboarding(user.telegram_id)
    ) {
      markOnboardingComplete(user.telegram_id);
      resetAnalyticsOnboardingSession();
    }
  }, [location.pathname, navigate, user]);

  useEffect(() => {
    if (user === null) {
      return;
    }

    if (
      location.pathname === "/analytics" &&
      hasSeenWelcomeStep(user.telegram_id) &&
      !hasSeenCalendarStep(user.telegram_id) &&
      !hasCompletedOnboarding(user.telegram_id)
    ) {
      navigate(getOnboardingCalendarPath());
    }
  }, [location.pathname, navigate, user]);

  function completeWelcomeStep() {
    if (user !== null) {
      markWelcomeStepSeen(user.telegram_id);
    }

    resetCalendarOnboardingSession();
    resetAnalyticsOnboardingSession();
    navigate(getOnboardingCalendarPath());
  }

  function completeCalendarStep() {
    if (user !== null) {
      markCalendarStepSeen(user.telegram_id);
    }

    calendarOverlayDismissed = true;
    resetAnalyticsOnboardingSession();
    notifyOnboardingListeners();
    navigate("/analytics");
  }

  function dismissAnalyticsOverlay() {
    analyticsOverlayDismissed = true;
    notifyOnboardingListeners();
  }

  return {
    completeCalendarStep,
    completeWelcomeStep,
    dismissAnalyticsOverlay,
    isAnalyticsDemoActive,
    isAnalyticsOverlayVisible,
    isCalendarDemoActive,
    isCalendarOnboardingPending,
    isCalendarOverlayVisible,
    isOnboardingActive: isWelcomeVisible || isCalendarDemoActive || isAnalyticsDemoActive,
    isWelcomeVisible,
  };
}

/** @deprecated Use useOnboarding */
export function useOnboardingWelcome() {
  const onboarding = useOnboarding();

  return {
    completeWelcome: onboarding.completeWelcomeStep,
    isWelcomeVisible: onboarding.isWelcomeVisible,
  };
}
