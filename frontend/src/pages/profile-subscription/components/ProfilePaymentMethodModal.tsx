import { useEffect, useRef } from "react";
import lottie from "lottie-web";

import type { AnimationItem } from "lottie-web";
import type { SubscriptionPaymentMethod } from "../../../features/subscription/api";
import dollarAnimation from "../../../shared/assets/icons/dollar.json";
import starAnimation from "../../../shared/assets/icons/star.json";

type ProfilePaymentMethodModalProps = {
  isSubmitting: boolean;
  priceLabel: string;
  onClose: () => void;
  onSelect: (method: SubscriptionPaymentMethod) => void;
};

const PAYMENT_METHODS: Array<{
  method: SubscriptionPaymentMethod;
  title: string;
  animationData: unknown;
}> = [
  {
    method: "telegram_stars",
    title: "Telegram Stars",
    animationData: starAnimation,
  },
  {
    method: "crypto_bot",
    title: "Crypto Bot",
    animationData: dollarAnimation,
  },
];

export function ProfilePaymentMethodModal({
  isSubmitting,
  priceLabel,
  onClose,
  onSelect,
}: ProfilePaymentMethodModalProps) {
  return (
    <div className="profile-subscription-page__modal" role="presentation">
      <button
        aria-label="Закрыть"
        className="profile-subscription-page__modal-backdrop"
        disabled={isSubmitting}
        type="button"
        onClick={onClose}
      />

      <section
        aria-labelledby="profile-subscription-payment-title"
        className="profile-subscription-page__modal-panel"
        role="dialog"
      >
        <h2 id="profile-subscription-payment-title">Способ оплаты</h2>
        <p>{priceLabel}</p>

        <div className="profile-subscription-page__payment-methods">
          {PAYMENT_METHODS.map((paymentMethod) => (
            <button
              className="profile-subscription-page__payment-method"
              disabled={isSubmitting}
              key={paymentMethod.method}
              type="button"
              onClick={() => onSelect(paymentMethod.method)}
            >
              <PaymentMethodIcon animationData={paymentMethod.animationData} />
              <span className="profile-subscription-page__payment-method-title">
                {paymentMethod.title}
              </span>
            </button>
          ))}
        </div>

        <button
          className="profile-subscription-page__modal-cancel"
          disabled={isSubmitting}
          type="button"
          onClick={onClose}
        >
          Отмена
        </button>
      </section>
    </div>
  );
}

function PaymentMethodIcon({ animationData }: { animationData: unknown }) {
  const animationContainerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (animationContainerRef.current === null) {
      return;
    }

    const animation: AnimationItem = lottie.loadAnimation({
      animationData,
      autoplay: true,
      container: animationContainerRef.current,
      loop: true,
      renderer: "svg",
    });

    return () => {
      animation.destroy();
    };
  }, [animationData]);

  return (
    <span
      aria-hidden="true"
      className="profile-subscription-page__payment-method-icon"
      ref={animationContainerRef}
    />
  );
}
