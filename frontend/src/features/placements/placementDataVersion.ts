import { invalidateAnalyticsCache } from "../analytics/analyticsCache";

let version = 0;

export function getPlacementDataVersion() {
  return version;
}

export function bumpPlacementDataVersion() {
  version += 1;
}

/** Сбрасывает кэш недели (счётчики и размещения) и аналитики. */
export function invalidatePlacementCaches() {
  bumpPlacementDataVersion();
  invalidateAnalyticsCache();
}
