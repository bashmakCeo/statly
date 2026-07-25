import type { Placement } from "../../entities/placement/model";
import { getPlacementLocalPublish } from "../../entities/placement/publish";
import { apiRequest } from "../../shared/api/client";

type PlacementCountDto = {
  channel_id: number;
  placements_count: number;
};

type PlacementCountsByDateDto = {
  date: string;
  channels: PlacementCountDto[];
};

type PlacementCountsByDateRangeDto = {
  start_date: string;
  end_date: string;
  days: PlacementCountsByDateDto[];
};

type PlacementFormatSuggestionsDto = {
  formats: string[];
};

type PlacementAnalyticsBucketDto = {
  channel_id: number;
  month: number;
  total_price: string;
  placements_count: number;
};

type PlacementAnalyticsDto = {
  year: number;
  buckets: PlacementAnalyticsBucketDto[];
};

export type PlacementAnalyticsBucket = {
  channelId: number;
  month: number;
  totalPrice: number;
  placementsCount: number;
};

export type PlacementAnalytics = {
  year: number;
  buckets: PlacementAnalyticsBucket[];
};

export type PlacementAnalyticsQuery = {
  byPurchaseDate?: boolean;
  paidOnly?: boolean;
};

function appendPlacementAnalyticsQuery(
  searchParams: URLSearchParams,
  query: PlacementAnalyticsQuery = {},
) {
  if (query.paidOnly) {
    searchParams.set("paid_only", "true");
  }

  if (query.byPurchaseDate) {
    searchParams.set("by_purchase_date", "true");
  }
}

type PlacementStatus = "paid" | "unpaid";

export type PlacementCreatePayload = {
  buyerName: string;
  buyerContact: string | null;
  channelId: number;
  comment: string | null;
  format: string;
  price: string;
  publishDate: string;
  publishTime: string | null;
  status: PlacementStatus;
};

export type PlacementUpdatePayload = Omit<PlacementCreatePayload, "channelId">;

type PlacementReadDto = {
  buyer_contact: string | null;
  buyer_name: string;
  channel_id: number;
  comment: string | null;
  created_at: string;
  format: string;
  id: number;
  price: string;
  publish_date: string;
  publish_time: string | null;
  seller_telegram_id: number;
  status: PlacementStatus;
  updated_at: string;
};

export async function getPlacementCountsByDateRange(startDate: string, endDate: string) {
  const result = await apiRequest<PlacementCountsByDateRangeDto>(
    `/api/placements/counts/range?start_date=${startDate}&end_date=${endDate}`,
  );

  return result.days.reduce<Record<string, Record<number, number>>>((countsByDate, day) => {
    countsByDate[day.date] = day.channels.reduce<Record<number, number>>(
      (countsByChannelId, channel) => {
        countsByChannelId[channel.channel_id] = channel.placements_count;

        return countsByChannelId;
      },
      {},
    );

    return countsByDate;
  }, {});
}

export async function getPlacementCountsByChannelDateRange(
  channelId: number,
  startDate: string,
  endDate: string,
) {
  const searchParams = new URLSearchParams({
    channel_id: String(channelId),
    end_date: endDate,
    start_date: startDate,
  });

  const result = await apiRequest<PlacementCountsByDateRangeDto>(
    `/api/placements/counts/range?${searchParams.toString()}`,
  );

  return result.days.reduce<Record<string, number>>((countsByDate, day) => {
    const channelCount = day.channels.find((channel) => channel.channel_id === channelId);
    countsByDate[day.date] = channelCount?.placements_count ?? 0;

    return countsByDate;
  }, {});
}

export async function getPlacementAnalyticsYears(query: PlacementAnalyticsQuery = {}) {
  const searchParams = new URLSearchParams();
  appendPlacementAnalyticsQuery(searchParams, query);
  const queryString = searchParams.toString();
  const result = await apiRequest<{ years: number[] }>(
    `/api/placements/analytics/years${queryString ? `?${queryString}` : ""}`,
  );

  return result.years;
}

export async function getPlacementAnalytics(
  year: number,
  channelIds: number[] = [],
  query: PlacementAnalyticsQuery = {},
) {
  const searchParams = new URLSearchParams({ year: String(year) });

  channelIds.forEach((channelId) => {
    searchParams.append("channel_id", String(channelId));
  });

  appendPlacementAnalyticsQuery(searchParams, query);

  const result = await apiRequest<PlacementAnalyticsDto>(
    `/api/placements/analytics?${searchParams.toString()}`,
  );

  return {
    year: result.year,
    buckets: result.buckets.map((bucket) => ({
      channelId: bucket.channel_id,
      month: bucket.month,
      totalPrice: Number(bucket.total_price),
      placementsCount: bucket.placements_count,
    })),
  } satisfies PlacementAnalytics;
}

export async function getPlacementFormatSuggestions(channelIds: number[]) {
  const searchParams = new URLSearchParams();

  channelIds.forEach((channelId) => {
    searchParams.append("channel_id", String(channelId));
  });

  const query = searchParams.toString();
  const path = query ? `/api/placements/formats?${query}` : "/api/placements/formats";
  const result = await apiRequest<PlacementFormatSuggestionsDto>(path);

  return result.formats;
}

export async function getPlacementsByDateRange(startDate: string, endDate: string) {
  const searchParams = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const placements = await apiRequest<PlacementReadDto[]>(
    `/api/placements?${searchParams.toString()}`,
  );

  return placements.map(mapPlacementDto);
}

export function indexPlacementsByChannelAndDate(
  placements: Placement[],
  timezone: string,
) {
  return placements.reduce<Record<number, Record<string, Placement[]>>>(
    (placementsByChannelId, placement) => {
      const placementsByDate = placementsByChannelId[placement.channelId] ?? {};
      const { publishDate } = getPlacementLocalPublish(placement, timezone);
      placementsByDate[publishDate] = [...(placementsByDate[publishDate] ?? []), placement];
      placementsByChannelId[placement.channelId] = placementsByDate;

      return placementsByChannelId;
    },
    {},
  );
}

export async function getPlacement(placementId: number) {
  const placement = await apiRequest<PlacementReadDto>(`/api/placements/${placementId}`);

  return mapPlacementDto(placement);
}

export async function updatePlacement(placementId: number, payload: PlacementUpdatePayload) {
  const placement = await apiRequest<PlacementReadDto>(`/api/placements/${placementId}`, {
    body: JSON.stringify({
      buyer_contact: payload.buyerContact,
      buyer_name: payload.buyerName,
      comment: payload.comment,
      format: payload.format,
      price: payload.price,
      publish_date: payload.publishDate,
      publish_time: payload.publishTime,
      status: payload.status,
    }),
    method: "PATCH",
  });

  return mapPlacementDto(placement);
}

export async function deletePlacement(placementId: number) {
  await apiRequest<void>(`/api/placements/${placementId}`, {
    method: "DELETE",
  });
}

export async function createPlacement(payload: PlacementCreatePayload) {
  // Внутри фронта используем camelCase, а backend API принимает snake_case.
  return apiRequest<PlacementReadDto>("/api/placements", {
    body: JSON.stringify({
      buyer_contact: payload.buyerContact,
      buyer_name: payload.buyerName,
      channel_id: payload.channelId,
      comment: payload.comment,
      format: payload.format,
      price: payload.price,
      publish_date: payload.publishDate,
      publish_time: payload.publishTime,
      status: payload.status,
    }),
    method: "POST",
  });
}

function mapPlacementDto(placement: PlacementReadDto): Placement {
  return {
    id: placement.id,
    channelId: placement.channel_id,
    buyerName: placement.buyer_name,
    buyerContact: placement.buyer_contact,
    comment: placement.comment,
    format: placement.format,
    price: placement.price,
    publishDateUtc: placement.publish_date,
    publishTimeUtc: placement.publish_time,
    status: placement.status,
  };
}
