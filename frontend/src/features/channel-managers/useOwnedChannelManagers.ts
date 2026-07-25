import { useCallback, useEffect, useMemo, useState } from "react";

import { useChannels } from "../channels/useChannels";
import { getChannelManagers } from "./api";
import { groupManagersByUsername } from "./groupManagers";
import type { ManagerListItem } from "./types";

export function useOwnedChannelManagers() {
  const { channels, isLoading: isChannelsLoading } = useChannels();
  const ownedChannels = useMemo(
    () => channels.filter((channel) => channel.accessRole === "owner"),
    [channels],
  );
  const [managers, setManagers] = useState<ManagerListItem[]>([]);
  const [isManagersLoading, setIsManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState<string | null>(null);

  const reloadManagers = useCallback(async () => {
    if (ownedChannels.length === 0) {
      setManagers([]);
      setManagersError(null);
      setIsManagersLoading(false);
      return;
    }

    setIsManagersLoading(true);
    setManagersError(null);

    try {
      const loadedManagers = await Promise.all(
        ownedChannels.map(async (channel) => {
          const channelManagers = await getChannelManagers(channel.id);

          return channelManagers.map((manager) => ({
            ...manager,
            channelTitle: channel.title,
          }));
        }),
      );

      setManagers(loadedManagers.flat());
    } catch (loadError: unknown) {
      console.error("Channel managers loading failed", loadError);
      setManagersError("Не удалось загрузить менеджеров");
    } finally {
      setIsManagersLoading(false);
    }
  }, [ownedChannels]);

  useEffect(() => {
    void reloadManagers();
  }, [reloadManagers]);

  const groupedManagers = useMemo(
    () => groupManagersByUsername(managers),
    [managers],
  );

  return {
    groupedManagers,
    isLoading: isChannelsLoading || isManagersLoading,
    managersError,
    ownedChannels,
    reloadManagers,
  };
}
