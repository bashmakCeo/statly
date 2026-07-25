import { API_BASE_URL, UPLOADS_PATH_PREFIX } from "../config/app";

export function getMediaUrl(path: string | null) {
  if (path === null) {
    return null;
  }

  // Локальные upload-пути отдаем через backend, а внешние URL оставляем как есть.
  if (path.startsWith(UPLOADS_PATH_PREFIX)) {
    return `${API_BASE_URL}${path}`;
  }

  return path;
}
