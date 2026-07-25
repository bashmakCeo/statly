export type DevTelegramUser = {
  key: string;
  label: string;
  initData: string;
};

export const DEV_USER_QUERY_PARAM = "dev_user";
export const DEV_USER_STORAGE_KEY = "statly_dev_telegram_user";
export const DEFAULT_DEV_USER_KEY = "demo_owner";

export const DEV_TELEGRAM_USERS: DevTelegramUser[] = [
  {
    key: "demo_owner",
    label: "demo_owner",
    initData:
      "query_id=demo-owner&user=%7B%22id%22%3A1000000001%2C%22first_name%22%3A%22Demo%22%2C%22last_name%22%3A%22Owner%22%2C%22username%22%3A%22demo_owner%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%7D&auth_date=1700000000",
  },
  {
    key: "demo_manager",
    label: "demo_manager",
    initData:
      "query_id=demo-manager&user=%7B%22id%22%3A1000000002%2C%22first_name%22%3A%22Demo%22%2C%22last_name%22%3A%22Manager%22%2C%22username%22%3A%22demo_manager%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Afalse%7D&auth_date=1700000000",
  },
  {
    key: "statly_demo",
    label: "statly_demo",
    initData:
      "query_id=statly-demo&user=%7B%22id%22%3A1000000003%2C%22first_name%22%3A%22Statly%22%2C%22last_name%22%3A%22Demo%22%2C%22username%22%3A%22statly_demo%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Afalse%7D&auth_date=1700000000",
  },
];

export function getDevUserByKey(key: string): DevTelegramUser | undefined {
  return DEV_TELEGRAM_USERS.find((user) => user.key === key);
}

export function resolveDevUserKey(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get(DEV_USER_QUERY_PARAM);

  if (fromUrl !== null && getDevUserByKey(fromUrl) !== undefined) {
    return fromUrl;
  }

  const fromStorage = localStorage.getItem(DEV_USER_STORAGE_KEY);

  if (fromStorage !== null && getDevUserByKey(fromStorage) !== undefined) {
    return fromStorage;
  }

  return DEFAULT_DEV_USER_KEY;
}

export function getDevInitData(): string {
  const user = getDevUserByKey(resolveDevUserKey());

  return user?.initData ?? DEV_TELEGRAM_USERS[0].initData;
}

export function switchDevUser(key: string) {
  if (getDevUserByKey(key) === undefined) {
    return;
  }

  localStorage.setItem(DEV_USER_STORAGE_KEY, key);

  const url = new URL(window.location.href);
  url.searchParams.set(DEV_USER_QUERY_PARAM, key);
  window.location.href = url.toString();
}
