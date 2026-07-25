import { Skeleton } from "../Skeleton/Skeleton";

export function CalendarSkeleton() {
  return (
    <section aria-busy="true" aria-label="Загрузка календаря" className="calendar-skeleton">
      <Skeleton className="calendar-skeleton__header" />
      <div className="calendar-skeleton__grid">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton className="calendar-skeleton__day" key={index} />
        ))}
      </div>
    </section>
  );
}
