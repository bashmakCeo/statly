import { Skeleton } from "../../shared/ui/Skeleton/Skeleton";

type ChannelListSkeletonProps = {
  rows?: number;
  title?: boolean;
};

export function ChannelListSkeleton({ rows = 3, title = false }: ChannelListSkeletonProps) {
  return (
    <section aria-busy="true" aria-label="Загрузка каналов" className="channel-list">
      {title ? <Skeleton className="channel-list-skeleton__title" /> : null}
      {Array.from({ length: rows }, (_, index) => (
        <div className="channel-list-skeleton__card" key={index}>
          <Skeleton className="channel-list-skeleton__avatar" />
          <div className="channel-list-skeleton__content">
            <Skeleton className="channel-list-skeleton__name" />
            <Skeleton className="channel-list-skeleton__meta" />
          </div>
        </div>
      ))}
    </section>
  );
}
