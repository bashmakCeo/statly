import { apiRequest } from "../../shared/api/client";

export type ChannelManager = {
  id: number;
  channelId: number;
  username: string;
  firstName: string | null;
  photoUrl: string | null;
};

type ChannelManagerDto = {
  id: number;
  channel_id: number;
  username: string;
  first_name: string | null;
  photo_url: string | null;
};

export async function getChannelManagers(channelId: number) {
  const managers = await apiRequest<ChannelManagerDto[]>(
    `/api/channels/${channelId}/managers`,
  );

  return managers.map(mapChannelManagerDto);
}

export async function addChannelManager(channelId: number, username: string) {
  const manager = await apiRequest<ChannelManagerDto>(
    `/api/channels/${channelId}/managers`,
    {
      body: JSON.stringify({ username }),
      method: "POST",
    },
  );

  return mapChannelManagerDto(manager);
}

export async function removeChannelManager(channelId: number, managerId: number) {
  await apiRequest<void>(`/api/channels/${channelId}/managers/${managerId}`, {
    method: "DELETE",
  });
}

export async function leaveManagedChannel(channelId: number) {
  await apiRequest<void>(`/api/channels/${channelId}/managers/me`, {
    method: "DELETE",
  });
}

function mapChannelManagerDto(manager: ChannelManagerDto): ChannelManager {
  return {
    id: manager.id,
    channelId: manager.channel_id,
    username: manager.username,
    firstName: manager.first_name,
    photoUrl: manager.photo_url,
  };
}
