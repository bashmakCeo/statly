import type { Channel } from "../../entities/channel/model";
import type { PlacementAnalyticsBucket } from "../placements/api";
import ethicalHackerPicture from "../../shared/assets/images/hacker.jpg";
import moskvachPicture from "../../shared/assets/images/moscwach.jpg";
import toporPicture from "../../shared/assets/images/topor.jpg";

export const ONBOARDING_MOCK_CHANNEL_IDS = {
  topor: -101,
  moskvach: -102,
  ethicalHacker: -103,
} as const;

const MOCK_CHANNEL_WEIGHTS = [
  { id: ONBOARDING_MOCK_CHANNEL_IDS.topor, title: "Топор", weight: 0.46, picture: toporPicture },
  {
    id: ONBOARDING_MOCK_CHANNEL_IDS.moskvach,
    title: "Москвач",
    weight: 0.34,
    picture: moskvachPicture,
  },
  {
    id: ONBOARDING_MOCK_CHANNEL_IDS.ethicalHacker,
    title: "Этичный Хакер",
    weight: 0.2,
    picture: ethicalHackerPicture,
  },
] as const;

const MOCK_MONTHLY_TOTALS = [
  420_000, 580_000, 390_000, 710_000, 850_000, 520_000, 670_000, 880_000, 740_000, 790_000,
  920_000, 1_050_000,
];

export const ONBOARDING_MOCK_CHANNELS: Channel[] = MOCK_CHANNEL_WEIGHTS.map((channel) => ({
  id: channel.id,
  title: channel.title,
  link: "",
  picture: channel.picture,
  postsCount: 0,
  accessRole: "owner",
  ownerUsername: null,
  ownerFirstName: null,
  ownerSubscriptionActive: true,
}));

export const ONBOARDING_MOCK_BUCKETS: PlacementAnalyticsBucket[] = MOCK_MONTHLY_TOTALS.flatMap(
  (monthTotal, monthIndex) => {
    const month = monthIndex + 1;
    let allocatedTotal = 0;

    return MOCK_CHANNEL_WEIGHTS.map((channel, channelIndex) => {
      const isLastChannel = channelIndex === MOCK_CHANNEL_WEIGHTS.length - 1;
      const variation = 0.92 + ((month + channelIndex) % 4) * 0.04;
      const totalPrice = isLastChannel
        ? monthTotal - allocatedTotal
        : Math.round(monthTotal * channel.weight * variation);
      allocatedTotal += totalPrice;

      return {
        channelId: channel.id,
        month,
        totalPrice,
        placementsCount: Math.max(1, Math.round(totalPrice / 28_000)),
      };
    });
  },
);

export function getOnboardingMockYear() {
  return new Date().getFullYear();
}
