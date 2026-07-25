import { apiRequest } from "../../shared/api/client";

type User = {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name?: string | null;
  photo_url?: string | null;
  is_premium?: boolean;
  timezone?: string;
  placement_reminders_enabled?: boolean;
};

type TelegramAuthResponse = {
  user: User;
};

export function authWithTelegram() {
  return apiRequest<TelegramAuthResponse>("/api/auth/telegram", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return apiRequest<User>("/api/auth/me");
}
