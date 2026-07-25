import { API_BASE_URL } from "../config/app";
import { getInitData } from "../telegram";

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  if (!(requestOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    headers.set("X-Telegram-Init-Data", getInitData());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type");

  if (contentType === null || !contentType.includes("application/json")) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
