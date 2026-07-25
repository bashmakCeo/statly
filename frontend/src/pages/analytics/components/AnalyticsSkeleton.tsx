import { Skeleton } from "../../../shared/ui/Skeleton/Skeleton";

export function AnalyticsSummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка аналитики">
      <div className="analytics-summary__total-row">
        <Skeleton className="analytics-skeleton__total" />
        <Skeleton className="analytics-skeleton__settings" />
      </div>
      <Skeleton className="analytics-skeleton__subtitle" />
      <Skeleton className="analytics-skeleton__chart" />
    </div>
  );
}

type AnalyticsChannelsSkeletonProps = {
  rows?: number;
};

export function AnalyticsChannelsSkeleton({ rows = 3 }: AnalyticsChannelsSkeletonProps) {
  return (
    <ul
      aria-busy="true"
      aria-label="Загрузка списка каналов"
      className="analytics-channels analytics-skeleton__channels"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li className="analytics-channels__item analytics-skeleton__channel-item" key={index}>
          <Skeleton className="analytics-skeleton__channel-avatar" />
          <div className="analytics-skeleton__channel-info">
            <Skeleton className="analytics-skeleton__channel-title" />
            <Skeleton className="analytics-skeleton__channel-meta" />
          </div>
          <Skeleton className="analytics-skeleton__channel-price" />
        </li>
      ))}
    </ul>
  );
}
