import type { Channel } from "../../entities/channel/model";
import toporPicture from "../../shared/assets/images/topor.jpg";
import { getDateKey } from "../../shared/lib/date";
import { ONBOARDING_MOCK_CHANNEL_IDS } from "./onboardingAnalyticsMock";

export const ONBOARDING_CALENDAR_CHANNEL: Channel = {
  id: ONBOARDING_MOCK_CHANNEL_IDS.topor,
  title: "Топор",
  link: "",
  picture: toporPicture,
  postsCount: 0,
  accessRole: "owner",
  ownerUsername: null,
  ownerFirstName: null,
  ownerSubscriptionActive: true,
};

function buildOnboardingCalendarCountsByDate(year: number) {
  const countsByDate: Record<string, number> = {};

  for (let month = 0; month < 12; month += 1) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      if (day % 2 !== 0) {
        continue;
      }

      countsByDate[getDateKey(new Date(year, month, day))] = ((day + month) % 3) + 1;
    }
  }

  return countsByDate;
}

export function getOnboardingCalendarPath() {
  return `/channels/${ONBOARDING_MOCK_CHANNEL_IDS.topor}/calendar`;
}

export function isOnboardingCalendarPath(pathname: string) {
  return pathname === getOnboardingCalendarPath();
}

export function getOnboardingCalendarCountsByDate() {
  return buildOnboardingCalendarCountsByDate(new Date().getFullYear());
}

export function getOnboardingCalendarSelectedDateCount(
  countsByDate: Record<string, number>,
  selectedDateKey: string,
) {
  return countsByDate[selectedDateKey] ?? 0;
}
