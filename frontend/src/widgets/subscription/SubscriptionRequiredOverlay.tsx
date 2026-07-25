import type { SubscriptionRequiredOverlayContext } from "../../features/subscription/subscriptionUtils";
import { getOwnerSubscriptionExpiredMessage } from "../../features/subscription/subscriptionUtils";
import type { ChannelBonus } from "../../features/subscription/api";
import { openTelegramLink } from "../../shared/lib/telegramLink";

type SubscriptionRequiredOverlayProps = {
  channelBonus: ChannelBonus | null;
  claimError: string | null;
  context: SubscriptionRequiredOverlayContext;
  isClaimingChannelBonus: boolean;
  onClaimChannelBonus: () => void;
  onDismiss: () => void;
  onSubscribe: () => void;
};

export function SubscriptionRequiredOverlay({
  channelBonus,
  claimError,
  context,
  isClaimingChannelBonus,
  onClaimChannelBonus,
  onDismiss,
  onSubscribe,
}: SubscriptionRequiredOverlayProps) {
  if (context.variant === "owner") {
    return (
      <div className="profile-subscription-page__modal profile-subscription-page__modal--elevated" role="presentation">
        <button
          aria-label="Закрыть"
          className="profile-subscription-page__modal-backdrop"
          type="button"
          onClick={onDismiss}
        />

        <section
          aria-labelledby="subscription-required-title"
          className="profile-subscription-page__modal-panel"
          role="dialog"
        >
          <h2 id="subscription-required-title">Подписка истекла</h2>
          <p>{getOwnerSubscriptionExpiredMessage(context.ownerLabel)}</p>

          <button
            className="profile-subscription-page__buy-button"
            type="button"
            onClick={onDismiss}
          >
            Понятно
          </button>
        </section>
      </div>
    );
  }

  const showChannelBonus = channelBonus?.eligible === true && channelBonus.claimed === false;

  return (
    <div className="profile-subscription-page__modal profile-subscription-page__modal--elevated" role="presentation">
      <button
        aria-label="Закрыть"
        className="profile-subscription-page__modal-backdrop"
        disabled={isClaimingChannelBonus}
        type="button"
        onClick={onDismiss}
      />

      <section
        aria-labelledby="subscription-required-title"
        className="profile-subscription-page__modal-panel"
        role="dialog"
      >
        <h2 id="subscription-required-title">Подписка истекла</h2>

        {showChannelBonus ? (
          <>
            <p className="subscription-required-overlay__bonus-text">
              {channelBonus.is_subscribed
                ? `Получите ${channelBonus.bonus_days} ${getDaysWord(channelBonus.bonus_days)} доступа за подписку на канал «${channelBonus.channel_title}»`
                : `Подпишитесь на канал «${channelBonus.channel_title}» и получите ${channelBonus.bonus_days} ${getDaysWord(channelBonus.bonus_days)} доступа бесплатно`}
            </p>

            <button
              className="profile-subscription-page__payment-method subscription-required-overlay__channel-button"
              disabled={isClaimingChannelBonus}
              type="button"
              onClick={() => openTelegramLink(channelBonus.channel_url)}
            >
              <span className="profile-subscription-page__payment-method-title">
                Подписаться на канал
              </span>
            </button>

            <button
              className="profile-subscription-page__buy-button"
              disabled={isClaimingChannelBonus}
              type="button"
              onClick={onClaimChannelBonus}
            >
              {isClaimingChannelBonus ? "Проверяем..." : "Получить бонус"}
            </button>

            {!channelBonus.is_subscribed || claimError !== null ? (
              <p className="subscription-required-overlay__error" role="alert">
                {claimError ?? "Подпишитесь на канал, чтобы получить бонус"}
              </p>
            ) : null}

            <p className="subscription-required-overlay__divider">или</p>
          </>
        ) : (
          <p>Оформите PRO, чтобы добавлять каналы и размещения.</p>
        )}

        {showChannelBonus ? (
          <p className="subscription-required-overlay__pro-hint">
            Оформите PRO для полного доступа без ограничений
          </p>
        ) : null}

        <button
          className="profile-subscription-page__buy-button"
          disabled={isClaimingChannelBonus}
          type="button"
          onClick={onSubscribe}
        >
          Оформить PRO
        </button>

        <button
          className="profile-subscription-page__modal-cancel"
          disabled={isClaimingChannelBonus}
          type="button"
          onClick={onDismiss}
        >
          Отмена
        </button>
      </section>
    </div>
  );
}

function getDaysWord(days: number) {
  if (days % 10 === 1 && days % 100 !== 11) {
    return "день";
  }

  if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) {
    return "дня";
  }

  return "дней";
}
