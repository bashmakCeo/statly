import { useEffect, useSyncExternalStore } from "react";

import type { Channel } from "../../entities/channel/model";
import { CHANNEL_TEXTS } from "../../shared/config/app";
import { getChannels } from "./api";

type ChannelsCacheSnapshot = {
  channels: Channel[];
  error: string | null;
  hasLoaded: boolean;
};

let channels: Channel[] = [];
let error: string | null = null;
let hasLoaded = false;
let loadPromise: Promise<void> | null = null;

let snapshot: ChannelsCacheSnapshot = {
  channels: [],
  error: null,
  hasLoaded: false,
};

const listeners = new Set<() => void>();

function publishSnapshot() {
  snapshot = {
    channels,
    error,
    hasLoaded,
  };
}

function emit() {
  publishSnapshot();
  listeners.forEach((listener) => listener());
}

export function subscribeChannelsCache(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getChannelsCacheSnapshot() {
  return snapshot;
}

export async function loadChannelsCache(force = false) {
  if (hasLoaded && !force) {
    return;
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      channels = await getChannels();
      error = null;
      hasLoaded = true;
    } catch (loadError: unknown) {
      console.error("Channels loading failed", loadError);
      channels = [];
      error = CHANNEL_TEXTS.loadingError;
      hasLoaded = true;
    } finally {
      loadPromise = null;
      emit();
    }
  })();

  return loadPromise;
}

export function addChannelToCache(channel: Channel) {
  if (!hasLoaded) {
    return;
  }

  channels = [channel, ...channels.filter((item) => item.id !== channel.id)];
  emit();
}

export function updateChannelInCache(channel: Channel) {
  if (!hasLoaded) {
    return;
  }

  const hasChannel = channels.some((item) => item.id === channel.id);

  if (!hasChannel) {
    return;
  }

  channels = channels.map((item) => (item.id === channel.id ? channel : item));
  emit();
}

export function removeChannelFromCache(channelId: number) {
  if (!hasLoaded) {
    return;
  }

  channels = channels.filter((channel) => channel.id !== channelId);
  emit();
}

export function useChannels() {
  const cacheSnapshot = useSyncExternalStore(
    subscribeChannelsCache,
    getChannelsCacheSnapshot,
    getChannelsCacheSnapshot,
  );

  useEffect(() => {
    void loadChannelsCache();
  }, []);

  return {
    channels: cacheSnapshot.channels,
    error: cacheSnapshot.error,
    isLoading: !cacheSnapshot.hasLoaded,
  };
}

