import {
  addMonths,
  getCalendarMonthDays,
  getDisplayDateValue,
  isSameCalendarDate,
} from "../placementCreateUtils";

const calendarWeekDays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const calendarMonthNames = [
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

type CalendarModalProps = {
  month: Date;
  selectedDate: Date | null;
  onClose: () => void;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: Date) => void;
};

export function CalendarModal({
  month,
  selectedDate,
  onClose,
  onMonthChange,
  onSelectDate,
}: CalendarModalProps) {
  const monthDays = getCalendarMonthDays(month);
  const activeDate = selectedDate ?? new Date();

  return (
    <div className="placement-calendar" role="dialog" aria-modal="true">
      <button
        className="placement-calendar__backdrop"
        type="button"
        aria-label="Закрыть календарь"
        onClick={onClose}
      />
      <div className="placement-calendar__panel">
        <header className="placement-calendar__header">
          <h2>
            {calendarMonthNames[month.getMonth()]}
            <span>{month.getFullYear()}</span>
          </h2>
          <div className="placement-calendar__nav">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() => onMonthChange(addMonths(month, -1))}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Следующий месяц"
              onClick={() => onMonthChange(addMonths(month, 1))}
            >
              ›
            </button>
          </div>
        </header>

        <div className="placement-calendar__weekdays" aria-hidden="true">
          {calendarWeekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="placement-calendar__grid">
          {monthDays.map((day, index) =>
            day === null ? (
              <span className="placement-calendar__empty" key={`empty-${index}`} />
            ) : (
              <button
                className={
                  isSameCalendarDate(day, activeDate)
                    ? "placement-calendar__day placement-calendar__day--selected"
                    : "placement-calendar__day"
                }
                type="button"
                key={getDisplayDateValue(day)}
                onClick={() => onSelectDate(day)}
              >
                {day.getDate()}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
