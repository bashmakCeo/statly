import type { Channel } from "../../entities/channel/model";
import type { PlacementAnalyticsBucket } from "../../features/placements/api";

export {
  ANALYTICS_BY_PURCHASE_DATE_STORAGE_KEY,
  ANALYTICS_PAID_ONLY_STORAGE_KEY,
  readAnalyticsByPurchaseDatePreference,
  readAnalyticsPaidOnlyPreference,
  writeAnalyticsByPurchaseDatePreference,
  writeAnalyticsPaidOnlyPreference,
} from "../../features/analytics/analyticsPreferences";

export const MONTH_SHORT_LABELS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

export const MONTH_FULL_LABELS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MONTH_PREPOSITIONAL_LABELS = [
  "январю",
  "февралю",
  "марту",
  "апрелю",
  "маю",
  "июню",
  "июлю",
  "августу",
  "сентябрю",
  "октябрю",
  "ноябрю",
  "декабрю",
];

export type MonthOverMonthComparison = {
  arrow: "↑" | "↓" | "→";
  direction: "up" | "down" | "flat";
  percentLabel: string;
  previousMonthLabel: string;
  previousTotal: number;
};

export type MonthlyTotal = {
  month: number;
  totalPrice: number;
  placementsCount: number;
};

export type ChannelStats = {
  channelId: number;
  totalPrice: number;
  placementsCount: number;
};

export type AnalyticsSummary = {
  totalPrice: number;
  placementsCount: number;
  monthlyTotals: MonthlyTotal[];
  channelStats: ChannelStats[];
};

export function getEmptySummary(): AnalyticsSummary {
  return {
    totalPrice: 0,
    placementsCount: 0,
    monthlyTotals: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      totalPrice: 0,
      placementsCount: 0,
    })),
    channelStats: [],
  };
}

// Для месячного фильтра суммируем только нужный месяц, поэтому передаем optional monthFilter.
export function summarizeAnalytics(
  buckets: PlacementAnalyticsBucket[],
  monthFilter: number | null = null,
): AnalyticsSummary {
  const monthlyTotals: MonthlyTotal[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    totalPrice: 0,
    placementsCount: 0,
  }));
  const channelTotals = new Map<number, ChannelStats>();
  let totalPrice = 0;
  let placementsCount = 0;

  for (const bucket of buckets) {
    monthlyTotals[bucket.month - 1].totalPrice += bucket.totalPrice;
    monthlyTotals[bucket.month - 1].placementsCount += bucket.placementsCount;

    if (monthFilter !== null && bucket.month !== monthFilter) {
      continue;
    }

    totalPrice += bucket.totalPrice;
    placementsCount += bucket.placementsCount;

    const currentChannelStats = channelTotals.get(bucket.channelId) ?? {
      channelId: bucket.channelId,
      totalPrice: 0,
      placementsCount: 0,
    };

    currentChannelStats.totalPrice += bucket.totalPrice;
    currentChannelStats.placementsCount += bucket.placementsCount;
    channelTotals.set(bucket.channelId, currentChannelStats);
  }

  return {
    totalPrice,
    placementsCount,
    monthlyTotals,
    channelStats: Array.from(channelTotals.values()),
  };
}

export function formatPrice(value: number) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatPriceCompact(value: number) {
  if (value >= 1_000_000) {
    return `${trimZeros((value / 1_000_000).toFixed(1))}M`;
  }

  if (value >= 1_000) {
    return `${trimZeros((value / 1_000).toFixed(0))}K`;
  }

  return Math.round(value).toString();
}

export function getYearOptions(currentYear: number) {
  const years: number[] = [];

  for (let year = currentYear + 1; year >= currentYear - 4; year -= 1) {
    years.push(year);
  }

  return years;
}

export function getVisibleYearOptions(
  currentYear: number,
  yearsWithPlacements: number[],
) {
  const yearsWithPlacementsSet = new Set(yearsWithPlacements);

  return getYearOptions(currentYear).filter(
    (year) => year === currentYear || yearsWithPlacementsSet.has(year),
  );
}

export function getPlacementsWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "размещение";
  }

  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return "размещения";
  }

  return "размещений";
}

export function getYearRangeLabel(year: number) {
  const shortYear = String(year).slice(2);
  return `01.01.${shortYear} - 31.12.${shortYear}`;
}

export function getSameMonthPreviousYearLabel(selectedMonth: number, year: number) {
  return `${MONTH_PREPOSITIONAL_LABELS[selectedMonth - 1]} ${year - 1}`;
}

export function formatYearOverYearPercent(percent: number) {
  const absolutePercent = Math.abs(percent);

  if (absolutePercent >= 10) {
    return `${Math.round(absolutePercent)}%`;
  }

  return `${absolutePercent.toFixed(1)}%`;
}

export function buildYearOverYearComparison(
  currentTotal: number,
  previousTotal: number,
  selectedMonth: number,
  year: number,
): MonthOverMonthComparison | null {
  const previousMonthLabel = getSameMonthPreviousYearLabel(selectedMonth, year);

  if (previousTotal === 0) {
    return null;
  }

  const percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;

  if (Math.abs(percentChange) < 0.05) {
    return {
      arrow: "→",
      direction: "flat",
      percentLabel: "0%",
      previousMonthLabel,
      previousTotal,
    };
  }

  if (percentChange > 0) {
    return {
      arrow: "↑",
      direction: "up",
      percentLabel: `+${formatYearOverYearPercent(percentChange)}`,
      previousMonthLabel,
      previousTotal,
    };
  }

  return {
    arrow: "↓",
    direction: "down",
    percentLabel: `−${formatYearOverYearPercent(percentChange)}`,
    previousMonthLabel,
    previousTotal,
  };
}

export function getChannelsFilterLabel(
  selectedChannelIds: number[] | null,
  channels: Channel[],
) {
  if (selectedChannelIds === null) {
    return "Все каналы";
  }

  if (selectedChannelIds.length === 0) {
    return "Все каналы";
  }

  if (selectedChannelIds.length === 1) {
    const channel = channels.find((item) => item.id === selectedChannelIds[0]);
    return channel?.title ?? "Канал";
  }

  return `${selectedChannelIds.length} каналов`;
}

function trimZeros(value: string) {
  return value.replace(/\.0+$/, "");
}
