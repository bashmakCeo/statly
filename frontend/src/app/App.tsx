import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { ScrollToTop } from "./ScrollToTop";
import { authWithTelegram } from "../features/auth/api";
import { prefetchAppData } from "../features/app/prefetchAppData";
import { useOnboarding } from "../features/onboarding/useOnboarding";
import {
  SubscriptionAccessProvider,
  useSubscriptionAccess,
} from "../features/subscription/SubscriptionAccessContext";
import { useSubscriptionExpiredNotice } from "../features/subscription/useSubscriptionExpiredNotice";
import { AnalyticsPage } from "../pages/analytics/AnalyticsPage";
import { ChannelCalendarPage } from "../pages/channel-calendar/ChannelCalendarPage";
import { ChannelCreatePage } from "../pages/channel-create/ChannelCreatePage";
import { ChannelDetailPage } from "../pages/channel-detail/ChannelDetailPage";
import { ChannelEditPage } from "../pages/channel-edit/ChannelEditPage";
import { ChannelSelectPage } from "../pages/channel-select/ChannelSelectPage";
import { HomePage } from "../pages/home/HomePage";
import { PlacementCreatePage } from "../pages/placement-create/PlacementCreatePage";
import { PlacementEditPage } from "../pages/placement-edit/PlacementEditPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { ProfileManagersPage } from "../pages/profile-managers/ProfileManagersPage";
import { ProfileManagerAddPage } from "../pages/profile-managers/ProfileManagerAddPage";
import { ProfileManagerDetailPage } from "../pages/profile-managers/ProfileManagerDetailPage";
import { ProfileSubscriptionPage } from "../pages/profile-subscription/ProfileSubscriptionPage";
import { PageContent } from "../shared/ui/PageContent/PageContent";
import { PageLayout } from "../shared/ui/PageLayout/PageLayout";
import { StateMessage } from "../shared/ui/StateMessage/StateMessage";
import { OnboardingWelcomeOverlay } from "../widgets/onboarding/OnboardingWelcomeOverlay";

export function App() {
  return (
    <SubscriptionAccessProvider>
      <AppRoutes />
    </SubscriptionAccessProvider>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const { completeWelcomeStep, isOnboardingActive, isWelcomeVisible } = useOnboarding();
  const { guardAction, showSubscriptionRequired } = useSubscriptionAccess();

  useSubscriptionExpiredNotice({
    isWelcomeVisible: isOnboardingActive,
    showSubscriptionRequired,
  });

  useEffect(() => {
    let ignoreResult = false;

    void (async () => {
      try {
        await authWithTelegram().then((response) => {
          prefetchAppData(response.user);
        });

        if (!ignoreResult) {
          setBootstrapError(null);
        }
      } catch (bootstrapError: unknown) {
        console.error("App bootstrap failed", bootstrapError);

        if (!ignoreResult) {
          setBootstrapError("Не удалось запустить приложение");
        }
      }
    })();

    return () => {
      ignoreResult = true;
    };
  }, []);

  if (bootstrapError !== null) {
    return (
      <PageLayout>
        <PageContent ariaLabel="Ошибка запуска">
          <StateMessage variant="error">{bootstrapError}</StateMessage>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route
        path="/"
        element={
          <HomePage
            onCreateChannel={() => {
              guardAction(() => navigate("/channels/create"), { requireOwnSubscription: true });
            }}
            onOpenChannel={(channelId, selectedDate) => {
              navigate(`/channels/${channelId}`, { state: { selectedDate } });
            }}
            onCreatePlacement={(selectedChannelIds) => {
              guardAction(
                () => {
                  if (selectedChannelIds !== undefined) {
                    navigate("/placements/create", { state: { selectedChannelIds } });
                    return;
                  }

                  navigate("/placements/channels");
                },
                selectedChannelIds !== undefined ? { channelIds: selectedChannelIds } : undefined,
              );
            }}
          />
        }
      />
      <Route
        path="/channels/create"
        element={<ChannelCreatePage onBack={() => navigate("/")} />}
      />
      <Route path="/channels/:channelId/calendar" element={<ChannelCalendarPage />} />
      <Route
        path="/channels/:channelId/edit"
        element={
          <ChannelEditPage
            onBack={() => navigate(-1)}
          />
        }
      />
      <Route
        path="/channels/:channelId"
        element={
          <ChannelDetailPage
            onBack={() => navigate("/")}
            onCreatePlacement={(channelId) => {
              guardAction(
                () => {
                  navigate("/placements/channels", { state: { selectedChannelIds: [channelId] } });
                },
                { channelIds: [channelId] },
              );
            }}
            onEditChannel={(channelId) => {
              guardAction(
                () => {
                  navigate(`/channels/${channelId}/edit`);
                },
                { requireOwnSubscription: true },
              );
            }}
          />
        }
      />
      <Route
        path="/placements/channels"
        element={
          <ChannelSelectPage
            onBack={() => navigate(-1)}
            onComplete={(selectedChannelIds) => {
              guardAction(
                () => {
                  navigate("/placements/create", { state: { selectedChannelIds } });
                },
                { channelIds: selectedChannelIds },
              );
            }}
          />
        }
      />
      <Route
        path="/placements/create"
        element={<PlacementCreatePage onBack={() => navigate(-1)} />}
      />
      <Route
        path="/placements/:placementId/edit"
        element={<PlacementEditPage onBack={() => navigate(-1)} />}
      />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route
        path="/profile/managers"
        element={<ProfileManagersPage onBack={() => navigate("/profile")} />}
      />
      <Route
        path="/profile/managers/add"
        element={<ProfileManagerAddPage onBack={() => navigate("/profile/managers")} />}
      />
      <Route
        path="/profile/managers/:username"
        element={<ProfileManagerDetailPage onBack={() => navigate("/profile/managers")} />}
      />
      <Route
        path="/profile/subscription"
        element={<ProfileSubscriptionPage onBack={() => navigate("/profile")} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
      {isWelcomeVisible ? (
        <OnboardingWelcomeOverlay onComplete={completeWelcomeStep} />
      ) : null}
    </>
  );
}
