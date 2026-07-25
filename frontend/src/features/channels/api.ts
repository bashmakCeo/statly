import type { Channel, ChannelAccessRole } from "../../entities/channel/model";
import { apiRequest } from "../../shared/api/client";

type ChannelDto = {
  id: number;
  link: string;
  title: string;
  picture: string | null;
  is_active: boolean;
  placements_count: number;
  access_role: ChannelAccessRole;
  owner_username: string | null;
  owner_first_name: string | null;
  owner_subscription_active: boolean | null;
};

type ChannelPictureUploadDto = {
  picture: string;
};

export type ChannelCreatePayload = {
  link: string;
  picture: string | null;
  title: string;
};

export type ChannelUpdatePayload = {
  is_active?: boolean;
  link?: string;
  picture?: string | null;
  title?: string;
};

export async function getChannels() {
  const channels = await apiRequest<ChannelDto[]>("/api/channels");
  return channels.map(mapChannelDto);
}

export async function getChannel(channelId: number) {
  const channel = await apiRequest<ChannelDto>(`/api/channels/${channelId}`);
  return mapChannelDto(channel);
}

export async function createChannel(payload: ChannelCreatePayload) {
  const channel = await apiRequest<ChannelDto>("/api/channels", {
    body: JSON.stringify({
      link: payload.link,
      picture: payload.picture,
      title: payload.title,
    }),
    method: "POST",
  });

  return mapChannelDto(channel);
}

export async function updateChannel(channelId: number, payload: ChannelUpdatePayload) {
  const channel = await apiRequest<ChannelDto>(`/api/channels/${channelId}`, {
    body: JSON.stringify(payload),
    method: "PATCH",
  });

  return mapChannelDto(channel);
}

export async function deactivateChannel(channelId: number) {
  return updateChannel(channelId, { is_active: false });
}

export async function uploadChannelPicture(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const result = await apiRequest<ChannelPictureUploadDto>("/api/channels/picture", {
    body: formData,
    method: "POST",
  });

  return result.picture;
}

function mapChannelDto(channel: ChannelDto): Channel {
  return {
    id: channel.id,
    link: channel.link,
    title: channel.title,
    picture: channel.picture,
    postsCount: channel.placements_count,
    accessRole: channel.access_role,
    ownerUsername: channel.owner_username,
    ownerFirstName: channel.owner_first_name,
    ownerSubscriptionActive: channel.owner_subscription_active,
  };
}
