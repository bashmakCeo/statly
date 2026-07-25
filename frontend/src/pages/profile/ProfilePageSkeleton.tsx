import { Skeleton } from "../../shared/ui/Skeleton/Skeleton";

export function ProfilePageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка профиля">
      <section className="profile-page__user-card">
        <Skeleton className="profile-page-skeleton__avatar" />
        <Skeleton className="profile-page-skeleton__name" />
        <Skeleton className="profile-page-skeleton__username" />
      </section>

      <section className="profile-page__section">
        <Skeleton className="profile-page-skeleton__section-title" />
        <div className="profile-page__section-content">
          <Skeleton className="profile-page-skeleton__row" />
          <Skeleton className="profile-page-skeleton__button" />
        </div>
      </section>

      <section className="profile-page__section">
        <Skeleton className="profile-page-skeleton__section-title" />
        <div className="profile-page__section-content">
          <Skeleton className="profile-page-skeleton__row" />
        </div>
      </section>

      <section className="profile-page__section">
        <Skeleton className="profile-page-skeleton__section-title" />
        <div className="profile-page__section-content">
          <Skeleton className="profile-page-skeleton__row" />
          <Skeleton className="profile-page-skeleton__row" />
        </div>
      </section>
    </div>
  );
}
