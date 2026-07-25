const DEV_API_PORT = "8000";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:${DEV_API_PORT}`
    : "");

export const UPLOADS_PATH_PREFIX = "/uploads/";

export const CHANNEL_TEXTS = {
  empty: "Пока нет каналов. Нажми плюс, чтобы добавить первый.",
  loadingError: "Не удалось загрузить каналы",
} as const;
