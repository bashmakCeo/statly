import { Skeleton } from "../Skeleton/Skeleton";

export function ChannelFormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка формы">
      <Skeleton className="channel-form-skeleton__photo" />
      <Skeleton className="channel-form-skeleton__field" />
      <Skeleton className="channel-form-skeleton__field" />
    </div>
  );
}
