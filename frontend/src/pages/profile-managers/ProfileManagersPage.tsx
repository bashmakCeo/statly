import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { GroupedManager } from "../../features/channel-managers/types";
import { useOwnedChannelManagers } from "../../features/channel-managers/useOwnedChannelManagers";
import plusIcon from "../../shared/assets/icons/Plus.svg";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";
import { Toast, useToast } from "../../shared/ui/Toast";
import { ChannelListSkeleton } from "../../widgets/channel-list/ChannelListSkeleton";

type ProfileManagersPageProps = {
  onBack: () => void;
};

type ProfileManagersLocationState = {
  popupMessage?: string;
};

export function ProfileManagersPage({ onBack }: ProfileManagersPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as ProfileManagersLocationState | null;
  const { groupedManagers, isLoading, managersError, ownedChannels } =
    useOwnedChannelManagers();
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (locationState?.popupMessage === undefined) {
      return;
    }

    showToast(locationState.popupMessage);
    navigate("/profile/managers", { replace: true, state: null });
  }, [locationState?.popupMessage, navigate, showToast]);

  function handleOpenManager(manager: GroupedManager) {
    navigate(`/profile/managers/${encodeURIComponent(manager.username)}`);
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="page-header__title-row">
          <button className="nav-button nav-button--back" type="button" onClick={onBack}>
            Назад
          </button>
          <h1 className="page-header__title">Менеджеры</h1>
          <span aria-hidden="true" className="nav-button nav-button--spacer" />
        </div>
      </PageHeader>

      <PageContent ariaLabel="Менеджеры" className="profile-managers-page">
        {isLoading ? <ChannelListSkeleton rows={3} /> : null}

        {!isLoading && ownedChannels.length === 0 ? (
          <StateMessage>Добавьте канал, чтобы назначить менеджеров</StateMessage>
        ) : null}

        {!isLoading && ownedChannels.length > 0 ? (
          <>
            {managersError !== null ? <StateMessage variant="error">{managersError}</StateMessage> : null}

            {managersError === null && groupedManagers.length === 0 ? (
              <p className="profile-managers-page__empty">Менеджеров пока нет</p>
            ) : null}

            {managersError === null && groupedManagers.length > 0 ? (
              <ul className="profile-managers-page__list">
                {groupedManagers.map((manager) => (
                  <li key={manager.username}>
                    <button
                      className="profile-managers-page__item"
                      type="button"
                      onClick={() => handleOpenManager(manager)}
                    >
                      {manager.photoUrl ? (
                        <img
                          alt=""
                          className="profile-managers-page__avatar"
                          src={manager.photoUrl}
                        />
                      ) : (
                        <div className="profile-managers-page__avatar profile-managers-page__avatar--fallback">
                          {(manager.firstName?.slice(0, 1) ?? manager.username.slice(0, 1)).toUpperCase()}
                        </div>
                      )}
                      <div className="profile-managers-page__item-content">
                        <span className="profile-managers-page__item-name">
                          {manager.firstName ?? `@${manager.username}`}
                        </span>
                        {manager.firstName !== null ? (
                          <span className="profile-managers-page__item-username">
                            @{manager.username}
                          </span>
                        ) : null}
                      </div>
                      <ChevronIcon />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </PageContent>

      {!isLoading && ownedChannels.length > 0 ? (
        <div className="floating-action">
          <button
            className="floating-action-button"
            type="button"
            aria-label="Добавить менеджера"
            onClick={() => navigate("/profile/managers/add")}
          >
            <img alt="" className="floating-action-button__icon" src={plusIcon} />
          </button>
        </div>
      ) : null}

      <Toast state={toast} variant="low" />
    </PageLayout>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="profile-managers-page__chevron"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
