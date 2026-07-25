import { apiRequest } from "../../shared/api/client";

export type ProfileUser = {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  photo_url: string | null;
  is_premium: boolean;
  timezone: string;
  placement_reminders_enabled: boolean;
  last_login_at: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
};

export type TimezoneOption = {
  id: string;
  label: string;
};

export type TimezoneOptionsResponse = {
  default_timezone: string;
  options: TimezoneOption[];
};

export function getTimezoneOptions() {
  return apiRequest<TimezoneOptionsResponse>("/api/auth/timezones");
}

export function updateUserTimezone(timezone: string) {
  return apiRequest<ProfileUser>("/api/auth/me/timezone", {
    method: "PATCH",
    body: JSON.stringify({ timezone }),
  });
}

export function updateUserSettings(settings: {
  timezone?: string;
  placement_reminders_enabled?: boolean;
}) {
  return apiRequest<ProfileUser>("/api/auth/me/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}
