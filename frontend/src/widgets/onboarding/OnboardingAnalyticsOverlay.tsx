import duckMoneyAnimation from "../../shared/assets/images/utka_money.json";
import { OnboardingSpeechOverlay } from "./OnboardingSpeechOverlay";

type OnboardingAnalyticsOverlayProps = {
  onComplete: () => void;
};

export function OnboardingAnalyticsOverlay({ onComplete }: OnboardingAnalyticsOverlayProps) {
  return (
    <OnboardingSpeechOverlay
      animationData={duckMoneyAnimation}
      ariaLabel="Обучение: аналитика"
      onComplete={onComplete}
      text="Тут ты можешь смотреть аналитику по выручке каналов: оборот за год, доход по месяцам и сравнение каналов."
      title="Аналитика"
      titleId="onboarding-analytics-title"
    />
  );
}
