import { prefetchDefaultAnalytics } from "../analytics/analyticsCache";
import { loadChannelsCache } from "../channels/channelsCache";
import { loadCurrentWeekData } from "../placements/weekDataStore";
import { loadProfileCache, seedProfileUser, type ProfileUser } from "../profile/profileCache";

export function prefetchAppData(authUser?: ProfileUser) {
  if (authUser !== undefined) {
    seedProfileUser(authUser);
  }

  void Promise.all([
    loadChannelsCache(),
    loadCurrentWeekData(),
    loadProfileCache(),
    prefetchDefaultAnalytics(),
  ]);
}
