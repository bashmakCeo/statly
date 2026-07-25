import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { Placement } from "../../entities/placement/model";
import { getPlacementLocalPublish } from "../../entities/placement/publish";
import { useProfile } from "../profile/profileCache";
import { getCurrentWeek, getDateKey, parseDateKey } from "../../shared/lib/date";
import { getDateKeyInTimezone, getUserTimezone, resolveTimezone } from "../../shared/lib/timezone";
import {
  getPlacementCountsByDateRange,
  getPlacementsByDateRange,
} from "./api";
import { getPlacementDataVersion } from "./placementDataVersion";

type WeekCacheEntry = {
  countsByDate: Record<string, Record<number, number>>;
  placements: Placement[];
};

type WeekDataSnapshot = {
  error: string | null;
  loadedWeekKeys: string[];
  loadingWeekKeys: string[];
  weeks: Record<string, WeekCacheEntry>;
};

function getWeekCacheKey(startDate: string, endDate: string) {
  return `${startDate}:${endDate}`;
}

let weeks: Record<string, WeekCacheEntry> = {};
let loadedWeekKeys: string[] = [];
let loadingWeekKeys: string[] = [];
let error: string | null = null;
let placementDataVersion = getPlacementDataVersion();
let loadedTimezone = getUserTimezone();
let snapshot: WeekDataSnapshot = createSnapshot();
const listeners = new Set<() => void>();
const loadPromises = new Map<string, Promise<void>>();

function createSnapshot(): WeekDataSnapshot {
  return {
    error,
    loadedWeekKeys,
    loadingWeekKeys,
    weeks,
  };
}

function publishSnapshot() {
  snapshot = createSnapshot();
}

function emit() {
  publishSnapshot();
  listeners.forEach((listener) => listener());
}

function syncLoadedTimezone() {
  const currentTimezone = getUserTimezone();

  if (currentTimezone === loadedTimezone) {
    return false;
  }

  loadedTimezone = currentTimezone;
  weeks = {};
  loadedWeekKeys = [];
  loadingWeekKeys = [];
  loadPromises.clear();
  error = null;
  emit();

  return true;
}

function syncPlacementDataVersion() {
  const currentVersion = getPlacementDataVersion();

  if (currentVersion === placementDataVersion) {
    return false;
  }

  placementDataVersion = currentVersion;
  weeks = {};
  loadedWeekKeys = [];
  loadingWeekKeys = [];
  loadPromises.clear();
  error = null;
  emit();

  return true;
}

export function subscribeWeekData(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getWeekDataSnapshot() {
  return snapshot;
}

export async function ensureWeekDataLoaded(startDate: string, endDate: string, force = false) {
  syncPlacementDataVersion();
  syncLoadedTimezone();

  const weekKey = getWeekCacheKey(startDate, endDate);

  if (!force && loadedWeekKeys.includes(weekKey)) {
    return;
  }

  const existingPromise = loadPromises.get(weekKey);

  if (existingPromise !== undefined) {
    return existingPromise;
  }

  if (!loadingWeekKeys.includes(weekKey)) {
    loadingWeekKeys = [...loadingWeekKeys, weekKey];
    emit();
  }

  const loadPromise = (async () => {
    try {
      const [countsByDate, placements] = await Promise.all([
        getPlacementCountsByDateRange(startDate, endDate),
        getPlacementsByDateRange(startDate, endDate),
      ]);

      weeks = {
        ...weeks,
        [weekKey]: {
          countsByDate,
          placements,
        },
      };
      loadedWeekKeys = loadedWeekKeys.includes(weekKey)
        ? loadedWeekKeys
        : [...loadedWeekKeys, weekKey];
      error = null;
    } catch (loadError: unknown) {
      console.error("Week data loading failed", loadError);
      error = "Не удалось загрузить данные недели";
    } finally {
      loadingWeekKeys = loadingWeekKeys.filter((key) => key !== weekKey);
      loadPromises.delete(weekKey);
      emit();
    }
  })();

  loadPromises.set(weekKey, loadPromise);

  return loadPromise;
}

export function loadCurrentWeekData(force = false) {
  const timezone = getUserTimezone();
  const todayKey = getDateKeyInTimezone(new Date(), timezone);
  const today = parseDateKey(todayKey) ?? new Date();
  const week = getCurrentWeek(today);
  const startDate = getDateKey(week[0]);
  const endDate = getDateKey(week[week.length - 1]);

  return ensureWeekDataLoaded(startDate, endDate, force);
}

export function useWeekPlacementCounts(selectedDateKey: string, startDate: string, endDate: string) {
  const { user } = useProfile();
  const timezone = resolveTimezone(user?.timezone);
  const weekSnapshot = useSyncExternalStore(subscribeWeekData, getWeekDataSnapshot, getWeekDataSnapshot);
  const weekKey = getWeekCacheKey(startDate, endDate);

  useEffect(() => {
    void ensureWeekDataLoaded(startDate, endDate);
  }, [endDate, startDate, timezone]);

  const weekEntry = weekSnapshot.weeks[weekKey];

  return {
    countsByChannel: weekEntry?.countsByDate[selectedDateKey] ?? {},
    error: weekSnapshot.error,
    isLoading:
      !weekSnapshot.loadedWeekKeys.includes(weekKey) &&
      weekSnapshot.loadingWeekKeys.includes(weekKey),
  };
}

export function useChannelWeekPlacements(
  channelId: number,
  selectedDateKey: string,
  startDate: string,
  endDate: string,
) {
  const { user } = useProfile();
  const timezone = resolveTimezone(user?.timezone);
  const weekSnapshot = useSyncExternalStore(subscribeWeekData, getWeekDataSnapshot, getWeekDataSnapshot);
  const weekKey = getWeekCacheKey(startDate, endDate);

  useEffect(() => {
    void ensureWeekDataLoaded(startDate, endDate);
  }, [endDate, startDate, timezone]);

  const weekEntry = weekSnapshot.weeks[weekKey];
  const isWeekLoaded = weekSnapshot.loadedWeekKeys.includes(weekKey);
  const placements = useMemo(
    () =>
      (weekEntry?.placements ?? []).filter((placement) => {
        if (placement.channelId !== channelId) {
          return false;
        }

        return getPlacementLocalPublish(placement, timezone).publishDate === selectedDateKey;
      }),
    [channelId, selectedDateKey, timezone, weekEntry?.placements],
  );

  return {
    error: weekSnapshot.error,
    isLoading: !isWeekLoaded && weekSnapshot.loadingWeekKeys.includes(weekKey),
    placements,
  };
}
