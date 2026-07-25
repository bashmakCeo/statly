export const calendarWeekDays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export const calendarMonthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

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

export function getMonthDateRange(month: Date) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  return { startDate, endDate };
}

export function getYearDateRange(year: number) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return { startDate, endDate };
}
