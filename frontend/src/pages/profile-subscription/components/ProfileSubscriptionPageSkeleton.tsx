import { Skeleton } from "../../../shared/ui/Skeleton/Skeleton";

export function ProfileSubscriptionPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка подписки" className="profile-subscription-page-skeleton">
      <section className="profile-subscription-page__plan profile-subscription-page__plan--free">
        <Skeleton className="profile-subscription-page-skeleton__plan-title" />
        <div className="profile-subscription-page__plan-body">
          <Skeleton className="profile-subscription-page-skeleton__feature" />
        </div>
      </section>

      <Skeleton className="profile-subscription-page-skeleton__button" />

      <section className="profile-subscription-page__plan profile-subscription-page__plan--pro">
        <Skeleton className="profile-subscription-page-skeleton__plan-title" />
        <div className="profile-subscription-page__plan-body">
          <Skeleton className="profile-subscription-page-skeleton__feature" />
          <Skeleton className="profile-subscription-page-skeleton__feature" />
          <Skeleton className="profile-subscription-page-skeleton__feature" />
          <Skeleton className="profile-subscription-page-skeleton__feature" />
        </div>
      </section>

      <Skeleton className="profile-subscription-page-skeleton__button" />
    </div>
  );
}
