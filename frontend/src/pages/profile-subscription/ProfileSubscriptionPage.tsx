import { useCallback, useEffect, useRef, useState } from "react";

import {
  createSubscriptionInvoice,
  getMySubscription,
  type MySubscription,
  type SubscriptionPaymentMethod,
} from "../../features/subscription/api";
import { loadProfileCache } from "../../features/profile/profileCache";
import {
  formatFreeTrialPeriodLabel,
  formatSubscriptionDate,
  getFreeTrialDescription,
  isSubscriptionActive,
} from "../../features/subscription/subscriptionUtils";
import { openSubscriptionInvoice } from "../../shared/lib/telegramPayment";
import { PageContent } from "../../shared/ui/PageContent/PageContent";
import { PageHeader } from "../../shared/ui/PageHeader/PageHeader";
import { PageLayout } from "../../shared/ui/PageLayout/PageLayout";
import { Toast, useToast } from "../../shared/ui/Toast";
import { ProfilePaymentMethodModal } from "./components/ProfilePaymentMethodModal";
import { ProfileSubscriptionPageSkeleton } from "./components/ProfileSubscriptionPageSkeleton";

type ProfileSubscriptionPageProps = {
  onBack: () => void;
};

const PRO_FEATURES = [
  {
    title: "Любое количество каналов",
    description: "Создавайте и ведите больше проектов одновременно",
  },
  {
    title: "Безлимит на размещения",
    description: "Планируйте сколько угодно размещений — без ограничений",
  },
  {
    title: "Учёт рекламы и доходов",
    description: "Отслеживайте продажи, суммы и рекламодателей",
  },
  {
    title: "Приоритетная поддержка",
    description: "Мы быстрее отвечаем на ваши обращения",
  },
];

export function ProfileSubscriptionPage({ onBack }: ProfileSubscriptionPageProps) {
  const [subscriptionState, setSubscriptionState] = useState<MySubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const { toast, showToast } = useToast();
  const shouldRefreshAfterPaymentRef = useRef(false);

  const loadSubscriptionState = useCallback(async () => {
    const loadedState = await getMySubscription();
    setSubscriptionState(loadedState);
    setIsLoading(false);
    void loadProfileCache(true);
  }, []);

  useEffect(() => {
    let ignoreResult = false;

    getMySubscription()
      .then((loadedState) => {
        if (!ignoreResult) {
          setSubscriptionState(loadedState);
          setIsLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        console.error("Subscription state loading failed", loadError);
        if (!ignoreResult) {
          setIsLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    function refreshAfterPayment() {
      if (!shouldRefreshAfterPaymentRef.current) {
        return;
      }

      if (document.visibilityState !== "visible") {
        return;
      }

      shouldRefreshAfterPaymentRef.current = false;
      void loadSubscriptionState().catch((loadError: unknown) => {
        console.error("Subscription state refresh failed", loadError);
      });
    }

    window.addEventListener("focus", refreshAfterPayment);
    document.addEventListener("visibilitychange", refreshAfterPayment);

    return () => {
      window.removeEventListener("focus", refreshAfterPayment);
      document.removeEventListener("visibilitychange", refreshAfterPayment);
    };
  }, [loadSubscriptionState]);

  const isProActive = isSubscriptionActive(subscriptionState?.pro_subscription);
  const isFreeActive = isSubscriptionActive(subscriptionState?.free_trial);
  const priceLabel = subscriptionState?.plan.price_label ?? null;
  const freeTrialTitle =
    subscriptionState === null
      ? null
      : formatFreeTrialPeriodLabel(subscriptionState.free_trial_days);
  const freeTrialDescription =
    subscriptionState === null
      ? null
      : getFreeTrialDescription(subscriptionState.free_trial, isProActive);
  const proExpiresAtLabel =
    subscriptionState?.pro_subscription === null ||
    subscriptionState?.pro_subscription === undefined
      ? null
      : formatSubscriptionDate(subscriptionState.pro_subscription.expires_at);
  const paymentButtonLabel =
    priceLabel === null
      ? null
      : `${isProActive ? "Продлить" : "Оплатить"} ${priceLabel.replace(" / месяц", "")}`;

  async function handlePaymentMethodSelect(method: SubscriptionPaymentMethod) {
    setIsSubmittingPayment(true);

    let invoice: Awaited<ReturnType<typeof createSubscriptionInvoice>>;

    try {
      invoice = await createSubscriptionInvoice(method);
    } catch (paymentError: unknown) {
      console.error("Subscription payment failed", paymentError);
      showToast("Не удалось создать счёт");
      setIsSubmittingPayment(false);
      return;
    }

    if (invoice.is_stub || !invoice.invoice_url) {
      setIsPaymentModalOpen(false);
      showToast(invoice.message ?? "Оплата временно недоступна");
      setIsSubmittingPayment(false);
      return;
    }

    setIsPaymentModalOpen(false);
    setIsSubmittingPayment(false);
    shouldRefreshAfterPaymentRef.current = true;

    try {
      openSubscriptionInvoice(invoice.invoice_url, invoice.method, () => {
        shouldRefreshAfterPaymentRef.current = false;
        void loadSubscriptionState().catch((loadError: unknown) => {
          console.error("Subscription state refresh failed", loadError);
        });
      });
    } catch (openError: unknown) {
      console.error("Subscription invoice opening failed", openError);
      showToast("Не удалось открыть счёт");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  return (
    <PageLayout>
      <PageHeader className="profile-subscription-page__header">
        <button className="nav-button nav-button--back" type="button" onClick={onBack}>
          Назад
        </button>
      </PageHeader>

      <PageContent ariaLabel="Управление подпиской" className="profile-subscription-page">
        {isLoading ? <ProfileSubscriptionPageSkeleton /> : null}
        {!isLoading && subscriptionState !== null ? (
          <>
            <section className="profile-subscription-page__plan profile-subscription-page__plan--free">
              <h1>FREE</h1>
              <div className="profile-subscription-page__plan-body">
                <FeatureItem
                  tone="muted"
                  title={freeTrialTitle ?? ""}
                  description={freeTrialDescription ?? ""}
                />
              </div>
            </section>

            {isFreeActive ? (
              <button className="profile-subscription-page__active-button" disabled type="button">
                Активировано
              </button>
            ) : null}

            <section className="profile-subscription-page__plan profile-subscription-page__plan--pro">
              <h1>PRO</h1>
              <div className="profile-subscription-page__plan-body">
                {PRO_FEATURES.map((feature) => (
                  <FeatureItem
                    description={feature.description}
                    key={feature.title}
                    title={feature.title}
                  />
                ))}
              </div>
            </section>

            {isProActive && proExpiresAtLabel !== null ? (
              <div className="profile-subscription-page__subscription-status" role="status">
                PRO активен до {proExpiresAtLabel}
              </div>
            ) : null}

            {paymentButtonLabel !== null ? (
              <button
                className="profile-subscription-page__buy-button"
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                {paymentButtonLabel}
              </button>
            ) : null}
          </>
        ) : null}
      </PageContent>

      {isPaymentModalOpen ? (
        <ProfilePaymentMethodModal
          isSubmitting={isSubmittingPayment}
          priceLabel={priceLabel ?? ""}
          onClose={() => {
            if (!isSubmittingPayment) {
              setIsPaymentModalOpen(false);
            }
          }}
          onSelect={handlePaymentMethodSelect}
        />
      ) : null}

      <Toast state={toast} variant="low-elevated" />
    </PageLayout>
  );
}

function FeatureItem({
  description,
  title,
  tone = "primary",
}: {
  description: string;
  title: string;
  tone?: "muted" | "primary";
}) {
  return (
    <article className="profile-subscription-page__feature">
      <span
        aria-hidden="true"
        className={
          tone === "muted"
            ? "profile-subscription-page__feature-icon profile-subscription-page__feature-icon--muted"
            : "profile-subscription-page__feature-icon"
        }
      >
        ✦
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </article>
  );
}
