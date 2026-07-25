import { getProfileCacheSnapshot } from "../../features/profile/profileCache";

export const DEFAULT_TIMEZONE = "Europe/Moscow";

export function resolveTimezone(timezone?: string | null) {
  const trimmed = timezone?.trim();

  return trimmed === undefined || trimmed === "" ? DEFAULT_TIMEZONE : trimmed;
}

export function getUserTimezone() {
  return resolveTimezone(getProfileCacheSnapshot().user?.timezone);
}

export function utcToLocalDateKey(isoUtc: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

export function utcToLocalDisplayDate(isoUtc: string, timezone: string) {
  const [year, month, day] = utcToLocalDateKey(isoUtc, timezone).split("-");

  return `${day}.${month}.${year}`;
}

export function utcToLocalTime(isoUtc: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoUtc));

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

export function utcPublishPartsToLocal(
  publishDateUtc: string,
  publishTimeUtc: string | null | undefined,
  timezone: string,
) {
  if (!publishTimeUtc) {
    return { publishDate: publishDateUtc, publishTime: "" };
  }

  const normalizedTime =
    publishTimeUtc.length === 5 ? `${publishTimeUtc}:00` : publishTimeUtc.slice(0, 8);
  const utcIso = `${publishDateUtc}T${normalizedTime}Z`;

  return {
    publishDate: utcToLocalDateKey(utcIso, timezone),
    publishTime: utcToLocalTime(utcIso, timezone),
  };
}

export function getDateKeyInTimezone(date: Date, timezone: string) {
  return utcToLocalDateKey(date.toISOString(), timezone);
}

export function getCurrentWeekDateKeys(timezone: string, referenceDate = new Date()) {
  const todayKey = getDateKeyInTimezone(referenceDate, timezone);
  const [year, month, day] = todayKey.split("-").map(Number);
  const referenceUtc = Date.UTC(year, month - 1, day);
  const weekday = new Date(referenceUtc).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const weekStartUtc = referenceUtc - mondayOffset * 24 * 60 * 60 * 1000;

  return Array.from({ length: 7 }, (_, index) => {
    const currentUtc = weekStartUtc + index * 24 * 60 * 60 * 1000;
    const currentDate = new Date(currentUtc);

    return `${currentDate.getUTCFullYear()}-${padDatePart(currentDate.getUTCMonth() + 1)}-${padDatePart(currentDate.getUTCDate())}`;
  });
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}
