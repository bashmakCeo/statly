import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useProfile } from "../../features/profile/profileCache";
import { ProfileFaqAccordion } from "./components/ProfileFaqAccordion";
import { ProfileSettingsSheet } from "./components/ProfileSettingsSheet";
import { ProfilePageSkeleton } from "./ProfilePageSkeleton";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../../shared/ui/StateMessage/StateMessage";

type TelegramWebAppWindow = Window & {
  Telegram?: {
    WebApp?: {
      openTelegramLink?: (url: string) => void;
    };
  };
};

const FEEDBACK_BOT_URL = "https://t.me/bashmak1";

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, subscriptionLabel, error, isLoading } = useProfile();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const displayName = useMemo(() => {
    if (user === null) {
      return "";
    }

    return user.first_name?.trim() || "Пользователь";
  }, [user]);
  const username =
    user?.username !== null && user?.username !== undefined ? `@${user.username}` : null;

  return (
    <PageLayout>
      <PageContent ariaLabel="Профиль" className="profile-page">
        {isLoading ? (
          <ProfilePageSkeleton />
        ) : error !== null ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : user !== null ? (
          <>
            <section className="profile-page__user-card" aria-label="Пользователь">
              {user.photo_url ? (
                <img
                  alt=""
                  className="profile-page__avatar"
                  src={user.photo_url}
                />
              ) : (
                <div className="profile-page__avatar profile-page__avatar--fallback">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <h1>{displayName}</h1>
              {username ? <p>{username}</p> : null}
            </section>

            <ProfileSection title="Тарифы">
              <div className="profile-page__row">
                <span>Подписка:</span>
                <span className="profile-page__row-value">{subscriptionLabel}</span>
              </div>
              <button
                className="profile-page__primary-button"
                type="button"
                onClick={() => navigate("/profile/subscription")}
              >
                Управление подпиской
              </button>
            </ProfileSection>

            <ProfileSection title="Менеджеры">
              <button
                className="profile-page__link-row"
                type="button"
                onClick={() => navigate("/profile/managers")}
              >
                <span>Управление менеджерами</span>
                <ChevronIcon />
              </button>
            </ProfileSection>

            <ProfileSection title="Дополнительная информация">
              <ProfileFaqAccordion />
              <button
                className="profile-page__link-row"
                type="button"
                onClick={(event) => {
                  event.currentTarget.blur();
                  setIsSettingsOpen(true);
                }}
              >
                <span>Настройки</span>
                <ChevronIcon />
              </button>
              <button
                className="profile-page__link-row"
                type="button"
                onClick={openFeedbackBot}
              >
                <span>Обратная связь</span>
                <ChevronIcon />
              </button>
            </ProfileSection>
          </>
        ) : null}
      </PageContent>

      <ProfileSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </PageLayout>
  );
}

function ProfileSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="profile-page__section">
      <h2>{title}</h2>
      <div className="profile-page__section-content">{children}</div>
    </section>
  );
}

function openFeedbackBot() {
  const telegramWebApp = (window as TelegramWebAppWindow).Telegram?.WebApp;

  if (telegramWebApp?.openTelegramLink) {
    telegramWebApp.openTelegramLink(FEEDBACK_BOT_URL);
    return;
  }

  window.open(FEEDBACK_BOT_URL, "_blank", "noopener,noreferrer");
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="profile-page__chevron"
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
