const WELCOME_STORAGE_PREFIX = "statly_onboarding_welcome_";
const WELCOME_STEP_STORAGE_PREFIX = "statly_onboarding_welcome_step_";
const CALENDAR_STEP_STORAGE_PREFIX = "statly_onboarding_calendar_step_";

function getWelcomeStorageKey(telegramId: number) {
  return `${WELCOME_STORAGE_PREFIX}${telegramId}`;
}

function getWelcomeStepStorageKey(telegramId: number) {
  return `${WELCOME_STEP_STORAGE_PREFIX}${telegramId}`;
}

function getCalendarStepStorageKey(telegramId: number) {
  return `${CALENDAR_STEP_STORAGE_PREFIX}${telegramId}`;
}

export function hasCompletedOnboarding(telegramId: number) {
  try {
    return localStorage.getItem(getWelcomeStorageKey(telegramId)) === "1";
  } catch {
    return false;
  }
}

export function hasSeenWelcomeStep(telegramId: number) {
  if (hasCompletedOnboarding(telegramId)) {
    return true;
  }

  try {
    return localStorage.getItem(getWelcomeStepStorageKey(telegramId)) === "1";
  } catch {
    return false;
  }
}

export function hasSeenCalendarStep(telegramId: number) {
  if (hasCompletedOnboarding(telegramId)) {
    return true;
  }

  try {
    return localStorage.getItem(getCalendarStepStorageKey(telegramId)) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeStepSeen(telegramId: number) {
  try {
    localStorage.setItem(getWelcomeStepStorageKey(telegramId), "1");
  } catch (error: unknown) {
    console.error("Failed to save onboarding welcome step state", error);
  }
}

export function markCalendarStepSeen(telegramId: number) {
  try {
    localStorage.setItem(getCalendarStepStorageKey(telegramId), "1");
  } catch (error: unknown) {
    console.error("Failed to save onboarding calendar step state", error);
  }
}

export function markOnboardingComplete(telegramId: number) {
  try {
    localStorage.setItem(getWelcomeStorageKey(telegramId), "1");
  } catch (error: unknown) {
    console.error("Failed to save onboarding state", error);
  }
}

/** @deprecated Use hasCompletedOnboarding */
export function hasSeenOnboardingWelcome(telegramId: number) {
  return hasCompletedOnboarding(telegramId);
}

/** @deprecated Use markOnboardingComplete */
export function markOnboardingWelcomeSeen(telegramId: number) {
  markOnboardingComplete(telegramId);
}
