import { OnboardingSpeechOverlay } from "./OnboardingSpeechOverlay";

type OnboardingWelcomeOverlayProps = {
  onComplete: () => void;
};

export function OnboardingWelcomeOverlay({ onComplete }: OnboardingWelcomeOverlayProps) {
  return (
    <OnboardingSpeechOverlay
      accentText="Тут ты можешь записывать проданную рекламу, смотреть аналитику и многое другое"
      ariaLabel="Приветствие"
      onComplete={onComplete}
      text="Я твой помощник для ведения каналов."
      title="Привет!"
      titleId="onboarding-welcome-title"
    />
  );
}
