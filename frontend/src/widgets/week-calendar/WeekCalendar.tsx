import calendarIcon from "../../shared/assets/icons/calendar.svg";
import { getDateKey, getDayLabel, isSameDate } from "../../shared/lib/date";

type WeekDay = {
  date: Date;
};

type WeekCalendarProps = {
  days: WeekDay[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onOpenMonthCalendar?: () => void;
};

export function WeekCalendar({
  days,
  selectedDate,
  onDateSelect,
  onOpenMonthCalendar,
}: WeekCalendarProps) {
  const today = new Date();
  const calendarClassName =
    onOpenMonthCalendar !== undefined
      ? "week-calendar week-calendar--with-month-button"
      : "week-calendar";

  return (
    <div className={calendarClassName} aria-label="Календарь недели">
      {days.map((day) => {
        const isSelected = getDateKey(day.date) === getDateKey(selectedDate);
        const isToday = isSameDate(day.date, today);

        return (
          <button
            aria-pressed={isSelected}
            className={isSelected ? "week-calendar__day week-calendar__day--active" : "week-calendar__day"}
            key={getDateKey(day.date)}
            onClick={() => onDateSelect(day.date)}
            type="button"
          >
            <span className="week-calendar__weekday">{getDayLabel(day.date)}</span>
            <strong>{day.date.getDate()}</strong>
            {isToday && !isSelected ? (
              <TodayStar />
            ) : (
              <span aria-hidden="true" className="week-calendar__today-star-spacer" />
            )}
          </button>
        );
      })}
      {onOpenMonthCalendar !== undefined ? (
        <button
          aria-label="Календарь размещений"
          className="week-calendar__month-button"
          type="button"
          onClick={onOpenMonthCalendar}
        >
          <img alt="" src={calendarIcon} />
        </button>
      ) : null}
    </div>
  );
}

function TodayStar() {
  return (
    <svg
      aria-hidden="true"
      className="week-calendar__today-star"
      fill="none"
      height="6"
      viewBox="0 0 6 6"
      width="6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 0.45 3.55 2.05 5.35 2.25 3.95 3.45 4.35 5.2 3 4.35 1.65 5.2 2.05 3.45 0.65 2.25 2.45 2.05 3 0.45Z"
        fill="currentColor"
      />
    </svg>
  );
}
