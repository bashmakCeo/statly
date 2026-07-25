const dayLabels = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const fullDayLabels = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];
const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // Для API нужна локальная календарная дата, без сдвига в UTC через toISOString().
  return `${year}-${month}-${day}`;
}

export function getCurrentWeek(date: Date) {
  const startOfWeek = new Date(date);
  const mondayOffset = (date.getDay() + 6) % 7;

  startOfWeek.setDate(date.getDate() - mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + index);

    return day;
  });
}

export function getDayLabel(date: Date) {
  return dayLabels[date.getDay()];
}

export function getShortDateLabel(date: Date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
}

export function getHeaderDateLabel(date: Date, today: Date) {
  if (isSameDate(date, today)) {
    return `Сегодня ${getShortDateLabel(date)},`;
  }

  if (isSameDate(date, addDays(today, 1))) {
    return `Завтра ${getShortDateLabel(date)},`;
  }

  return `${fullDayLabels[date.getDay()]} ${getShortDateLabel(date)},`;
}

export function isSameDate(firstDate: Date, secondDate: Date) {
  return getDateKey(firstDate) === getDateKey(secondDate);
}

export function parseDateKey(dateKey: string | undefined) {
  if (dateKey === undefined) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
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

export function getChannelPlacementsEmptyLabel(date: Date) {
  return `На ${date.getDate()} ${monthNames[date.getMonth()]} размещений не запланировано`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);

  return nextDate;
}
