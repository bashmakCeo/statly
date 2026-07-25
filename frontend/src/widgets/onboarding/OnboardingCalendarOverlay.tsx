import calendarUtkaAnimation from "../../shared/assets/images/calendar_utka.json";
import { OnboardingSpeechOverlay } from "./OnboardingSpeechOverlay";

type OnboardingCalendarOverlayProps = {
  onComplete: () => void;
};

export function OnboardingCalendarOverlay({ onComplete }: OnboardingCalendarOverlayProps) {
  return (
    <OnboardingSpeechOverlay
      animationData={calendarUtkaAnimation}
      ariaLabel="Обучение: календарь"
      onComplete={onComplete}
      text="Каждая синяя точка под датой — это одно размещение. Так ты сразу видишь, в какие дни у канала запланирована реклама."
      title="Календарь"
      titleId="onboarding-calendar-title"
    />
  );
}
