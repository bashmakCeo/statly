import type { Channel } from "../../entities/channel/model";
import type { Placement } from "../../entities/placement/model";
import { getPlacementLocalPublish } from "../../entities/placement/publish";
import { getUserTimezone } from "../../shared/lib/timezone";
import type { PlacementForm } from "./model";

export function getSelectedChannelsTitle(channels: Channel[]) {
  if (channels.length === 0) {
    return "Выбранные каналы";
  }

  if (channels.length === 1) {
    return channels[0].title;
  }

  return `${channels[0].title} +${channels.length - 1}`;
}

export function areChannelPricesFilled(
  channelIds: number[] | undefined,
  pricesByChannelId: Record<number, string>,
) {
  return (
    channelIds !== undefined &&
    channelIds.every((channelId) => (pricesByChannelId[channelId] ?? "").trim() !== "")
  );
}

export function getPlacementPricesByChannel(
  channelIds: number[] | undefined,
  totalPrice: string,
  pricesByChannelId: Record<number, string>,
  usesPerChannelPrices: boolean,
) {
  if (channelIds === undefined || channelIds.length === 0) {
    return null;
  }

  if (!usesPerChannelPrices) {
    return splitPriceEvenlyByChannel(totalPrice, channelIds);
  }

  return channelIds.reduce<Record<number, string> | null>((placementPrices, channelId) => {
    if (placementPrices === null) {
      return null;
    }

    const normalizedPrice = normalizePlacementPrice(pricesByChannelId[channelId] ?? "");

    if (normalizedPrice === null) {
      return null;
    }

    placementPrices[channelId] = normalizedPrice;

    return placementPrices;
  }, {});
}

export function getInitialChannelPrices(
  channelIds: number[] | undefined,
  totalPrice: string,
  currentPrices: Record<number, string>,
) {
  if (channelIds === undefined) {
    return currentPrices;
  }

  const splitPrices = splitPriceEvenlyByChannel(totalPrice, channelIds);

  return channelIds.reduce<Record<number, string>>((pricesByChannelId, channelId) => {
    const currentPrice = currentPrices[channelId] ?? "";

    pricesByChannelId[channelId] =
      currentPrice.trim() !== "" ? currentPrice : splitPrices?.[channelId] ?? "";

    return pricesByChannelId;
  }, {});
}

export function getChannelPricesTotalValue(
  channelIds: number[] | undefined,
  pricesByChannelId: Record<number, string>,
) {
  if (channelIds === undefined || channelIds.length === 0) {
    return null;
  }

  let totalCents = 0;

  for (const channelId of channelIds) {
    const priceCents = parsePriceToCents(pricesByChannelId[channelId] ?? "");

    if (priceCents === null) {
      return null;
    }

    totalCents += priceCents;
  }

  return formatPriceFromCents(totalCents);
}

export function getSplitPriceHint(channelCount: number) {
  return `${channelCount} ${getChannelsWord(channelCount)}: сумма будет разделена поровну`;
}

function splitPriceEvenlyByChannel(totalPrice: string, channelIds: number[]) {
  const splitPrices = splitPriceEvenly(totalPrice, channelIds.length);

  if (splitPrices === null) {
    return null;
  }

  return channelIds.reduce<Record<number, string>>((pricesByChannelId, channelId, index) => {
    pricesByChannelId[channelId] = splitPrices[index];

    return pricesByChannelId;
  }, {});
}

function splitPriceEvenly(totalPrice: string, count: number) {
  if (count <= 0) {
    return null;
  }

  const totalCents = parsePriceToCents(totalPrice);

  if (totalCents === null) {
    return null;
  }

  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents % count;

  return Array.from({ length: count }, (_, index) =>
    formatPriceFromCents(baseCents + (index < remainderCents ? 1 : 0)),
  );
}

export function normalizePlacementPrice(priceValue: string) {
  const priceCents = parsePriceToCents(priceValue);

  return priceCents === null ? null : formatPriceFromCents(priceCents);
}

export function formatPriceInput(value: string) {
  const normalizedValue = value.replace(",", ".");
  const [integerPart, ...decimalParts] = normalizedValue.split(".");
  const digits = integerPart.replace(/\D/g, "");

  if (decimalParts.length === 0) {
    return digits;
  }

  const decimals = decimalParts.join("").replace(/\D/g, "").slice(0, 2);

  return `${digits}.${decimals}`;
}

function parsePriceToCents(priceValue: string) {
  const normalizedValue = priceValue.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return null;
  }

  return Math.round(Number(normalizedValue) * 100);
}

function formatPriceFromCents(priceCents: number) {
  const price = (priceCents / 100).toFixed(2);

  return price.endsWith(".00") ? price.slice(0, -3) : price;
}

function getChannelsWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "канал";
  }

  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return "канала";
  }

  return "каналов";
}

export function getInitialCalendarMonth() {
  const currentDate = new Date();

  return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
}

export function getCalendarMonthFromInput(dateValue: string) {
  const parsedDate = parseDisplayDate(dateValue);

  if (parsedDate === null) {
    return getInitialCalendarMonth();
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
}

export function parseDisplayDate(dateValue: string) {
  const dateParts = dateValue.trim().split(".");

  if (dateParts.length !== 3) {
    return null;
  }

  const [day, month, year] = dateParts.map(Number);

  if (!isValidDatePart(day, 1, 31) || !isValidDatePart(month, 1, 12) || year < 2000) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

export function getDisplayDateValue(date: Date) {
  return `${padDatePart(date.getDate())}.${padDatePart(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function getCalendarMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
  const emptyDays = Array.from<null>({ length: mondayBasedOffset }).fill(null);
  const monthDays = Array.from(
    { length: daysInMonth },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
  );

  return [...emptyDays, ...monthDays];
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isSameCalendarDate(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export function blurActiveElement() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function getOptionalValue(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : trimmedValue;
}

// Маска даты: оставляем только цифры и автоматически собираем вид дд.мм.гггг.
export function formatDateInput(value: string, previousValue = "") {
  // Если пользователь стирает автоточку, удаляем и предыдущую цифру, чтобы точка не "залипала".
  const isDeletingAutoDot = previousValue.endsWith(".") && value === previousValue.slice(0, -1);
  const rawDigits = value.replace(/\D/g, "").slice(0, 8);
  const digits = isDeletingAutoDot ? rawDigits.slice(0, -1) : rawDigits;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) {
    return digits.length === 2 ? `${day}.` : day;
  }

  if (digits.length <= 4) {
    return digits.length === 4 ? `${day}.${month}.` : `${day}.${month}`;
  }

  return `${day}.${month}.${year}`;
}

export function getDisplayDateFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-");

  return `${day}.${month}.${year}`;
}

export function mapPlacementToForm(placement: Placement): PlacementForm {
  const { publishDate, publishTime } = getPlacementLocalPublish(
    placement,
    getUserTimezone(),
  );

  return {
    advertiserContact: placement.buyerContact ?? "",
    campaignName: placement.buyerName,
    comment: placement.comment ?? "",
    date: getDisplayDateFromDateKey(publishDate),
    format: placement.format,
    price: placement.price,
    time: publishTime,
  };
}

export function getPlacementUpdatedMessage() {
  return "Размещение обновлено";
}

export function getPlacementDeletedMessage() {
  return "Размещение удалено";
}

export function getPlacementCreatedMessage(count: number) {
  if (count === 1) {
    return "Размещение добавлено";
  }

  return `${count} ${getPlacementsWord(count)} добавлено`;
}

// Склонение нужно для popup после создания нескольких размещений.
function getPlacementsWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "размещение";
  }

  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return "размещения";
  }

  return "размещений";
}

export function getPublishDateTimeValue(dateValue: string, timeValue: string) {
  const validation = validatePublishDateTime(dateValue, timeValue);

  return validation.ok ? validation.value : null;
}

export type PublishDateTimeValidationResult =
  | {
      ok: true;
      value: {
        publishDate: string;
        publishTime: string | null;
      };
    }
  | {
      ok: false;
      reason: "date" | "time";
    };

export function validatePublishDateTime(
  dateValue: string,
  timeValue: string,
): PublishDateTimeValidationResult {
  const dateParts = dateValue.trim().split(".");

  if (dateParts.length !== 3) {
    return { ok: false, reason: "date" };
  }

  const [day, month, year] = dateParts.map(Number);

  if (!isValidDatePart(day, 1, 31) || !isValidDatePart(month, 1, 12) || year < 2000) {
    return { ok: false, reason: "date" };
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { ok: false, reason: "date" };
  }

  const publishDate = `${year}-${padDatePart(month)}-${padDatePart(day)}`;
  const trimmedTime = timeValue.trim();

  if (trimmedTime === "") {
    return { ok: true, value: { publishDate, publishTime: null } };
  }

  const [hours, minutes] = getTimeParts(trimmedTime);

  if (hours === null || minutes === null) {
    return { ok: false, reason: "time" };
  }

  return {
    ok: true,
    value: {
      publishDate,
      publishTime: `${padDatePart(hours)}:${padDatePart(minutes)}`,
    },
  };
}

function getTimeParts(timeValue: string): [number, number] | [null, null] {
  const normalizedTime = timeValue.trim().replace(/[.,\s]+/g, ":");
  const timeParts = normalizedTime.split(":");

  if (timeParts.length === 1 && /^\d{1,2}$/.test(timeParts[0])) {
    const hours = Number(timeParts[0]);

    return isValidDatePart(hours, 0, 23) ? [hours, 0] : [null, null];
  }

  if (timeParts.length === 1 && /^\d{3,4}$/.test(timeParts[0])) {
    const rawTime = timeParts[0];
    const hours = Number(rawTime.slice(0, -2));
    const minutes = Number(rawTime.slice(-2));

    return isValidDatePart(hours, 0, 23) && isValidDatePart(minutes, 0, 59)
      ? [hours, minutes]
      : [null, null];
  }

  if (timeParts.length !== 2) {
    return [null, null];
  }

  const [hours, minutes] = timeParts.map(Number);

  if (!isValidDatePart(hours, 0, 23) || !isValidDatePart(minutes, 0, 59)) {
    return [null, null];
  }

  return [hours, minutes];
}

function isValidDatePart(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

