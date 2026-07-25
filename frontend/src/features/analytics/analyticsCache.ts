import { useEffect, useSyncExternalStore } from "react";

import {
  getPlacementAnalytics,
  getPlacementAnalyticsYears,
  type PlacementAnalyticsBucket,
  type PlacementAnalyticsQuery,
} from "../placements/api";
import {
  readDefaultAnalyticsQuery,
} from "./analyticsPreferences";

type AnalyticsDataEntry = {
  buckets: PlacementAnalyticsBucket[];
  error: string | null;
  hasLoaded: boolean;
  isLoading: boolean;
};

type AnalyticsYearsEntry = {
  error: string | null;
  hasLoaded: boolean;
  isLoading: boolean;
  years: number[];
};

type AnalyticsCacheSnapshot = {
  dataEntries: Record<string, AnalyticsDataEntry>;
  yearsEntries: Record<string, AnalyticsYearsEntry>;
};

const emptyDataEntry = (): AnalyticsDataEntry => ({
  buckets: [],
  error: null,
  hasLoaded: false,
  isLoading: false,
});

const emptyYearsEntry = (): AnalyticsYearsEntry => ({
  error: null,
  hasLoaded: false,
  isLoading: false,
  years: [],
});

let dataEntries: Record<string, AnalyticsDataEntry> = {};
let yearsEntries: Record<string, AnalyticsYearsEntry> = {};
const dataLoadPromises = new Map<string, Promise<void>>();
const yearsLoadPromises = new Map<string, Promise<void>>();

let snapshot: AnalyticsCacheSnapshot = {
  dataEntries,
  yearsEntries,
};

const listeners = new Set<() => void>();

function publishSnapshot() {
  snapshot = {
    dataEntries,
    yearsEntries,
  };
}

function emit() {
  publishSnapshot();
  listeners.forEach((listener) => listener());
}

function buildQueryKey(query: PlacementAnalyticsQuery) {
  return `${query.paidOnly ? "1" : "0"}:${query.byPurchaseDate ? "1" : "0"}`;
}

function buildYearsKey(query: PlacementAnalyticsQuery) {
  return `years:${buildQueryKey(query)}`;
}

function buildDataKey(year: number, channelIds: number[] | null, query: PlacementAnalyticsQuery) {
  const channelPart =
    channelIds === null || channelIds.length === 0
      ? "all"
      : [...channelIds].sort((first, second) => first - second).join(",");
  return `${year}:${channelPart}:${buildQueryKey(query)}`;
}

export function subscribeAnalyticsCache(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getAnalyticsCacheSnapshot() {
  return snapshot;
}

export async function loadAnalyticsYearsCache(query: PlacementAnalyticsQuery, force = false) {
  const key = buildYearsKey(query);
  const currentEntry = yearsEntries[key] ?? emptyYearsEntry();

  if (currentEntry.hasLoaded && !force) {
    return;
  }

  const existingPromise = yearsLoadPromises.get(key);
  if (existingPromise !== undefined) {
    return existingPromise;
  }

  yearsEntries = {
    ...yearsEntries,
    [key]: {
      ...currentEntry,
      isLoading: true,
    },
  };
  emit();

  const loadPromise = (async () => {
    try {
      const years = await getPlacementAnalyticsYears(query);
      yearsEntries = {
        ...yearsEntries,
        [key]: {
          error: null,
          hasLoaded: true,
          isLoading: false,
          years,
        },
      };
    } catch (loadError: unknown) {
      console.error("Analytics years loading failed", loadError);
      yearsEntries = {
        ...yearsEntries,
        [key]: {
          error: null,
          hasLoaded: true,
          isLoading: false,
          years: [],
        },
      };
    } finally {
      yearsLoadPromises.delete(key);
      emit();
    }
  })();

  yearsLoadPromises.set(key, loadPromise);
  return loadPromise;
}

export async function loadAnalyticsDataCache(
  year: number,
  channelIds: number[] | null,
  query: PlacementAnalyticsQuery,
  force = false,
) {
  const key = buildDataKey(year, channelIds, query);
  const currentEntry = dataEntries[key] ?? emptyDataEntry();

  if (currentEntry.hasLoaded && !force) {
    return;
  }

  const existingPromise = dataLoadPromises.get(key);
  if (existingPromise !== undefined) {
    return existingPromise;
  }

  dataEntries = {
    ...dataEntries,
    [key]: {
      ...currentEntry,
      isLoading: true,
    },
  };
  emit();

  const loadPromise = (async () => {
    try {
      const analytics = await getPlacementAnalytics(year, channelIds ?? [], query);
      dataEntries = {
        ...dataEntries,
        [key]: {
          buckets: analytics.buckets,
          error: null,
          hasLoaded: true,
          isLoading: false,
        },
      };
    } catch (loadError: unknown) {
      console.error("Analytics loading failed", loadError);
      dataEntries = {
        ...dataEntries,
        [key]: {
          buckets: [],
          error: "Не удалось загрузить аналитику",
          hasLoaded: true,
          isLoading: false,
        },
      };
    } finally {
      dataLoadPromises.delete(key);
      emit();
    }
  })();

  dataLoadPromises.set(key, loadPromise);
  return loadPromise;
}

export function prefetchDefaultAnalytics() {
  const year = new Date().getFullYear();
  const query = readDefaultAnalyticsQuery();

  void loadAnalyticsYearsCache(query);
  void loadAnalyticsDataCache(year, null, query);
}

export function invalidateAnalyticsCache() {
  dataEntries = {};
  yearsEntries = {};
  dataLoadPromises.clear();
  yearsLoadPromises.clear();
  emit();
}

export function useAnalytics(
  year: number,
  channelIds: number[] | null,
  query: PlacementAnalyticsQuery,
) {
  const cacheSnapshot = useSyncExternalStore(
    subscribeAnalyticsCache,
    getAnalyticsCacheSnapshot,
    getAnalyticsCacheSnapshot,
  );
  const yearsKey = buildYearsKey(query);
  const dataKey = buildDataKey(year, channelIds, query);
  const yearsEntry = cacheSnapshot.yearsEntries[yearsKey] ?? emptyYearsEntry();
  const dataEntry = cacheSnapshot.dataEntries[dataKey] ?? emptyDataEntry();
  const channelIdsDep =
    channelIds === null ? "all" : [...channelIds].sort((first, second) => first - second).join(",");

  useEffect(() => {
    void loadAnalyticsYearsCache(query);
  }, [query.byPurchaseDate, query.paidOnly]);

  useEffect(() => {
    void loadAnalyticsDataCache(year, channelIds, query);
  }, [year, channelIdsDep, query.byPurchaseDate, query.paidOnly]);

  return {
    analyticsBuckets: dataEntry.buckets,
    analyticsError: dataEntry.error,
    isAnalyticsLoading: !dataEntry.hasLoaded,
    isYearsLoading: !yearsEntry.hasLoaded,
    yearsWithPlacements: yearsEntry.years,
  };
}
