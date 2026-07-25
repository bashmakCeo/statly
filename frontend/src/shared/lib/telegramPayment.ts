type TelegramWebAppWindow = Window & {
  Telegram?: {
    WebApp?: {
      openInvoice?: (url: string, callback?: (status: string) => void) => void;
      openLink?: (url: string) => void;
      openTelegramLink?: (url: string) => void;
    };
  };
};

type SubscriptionPaymentMethod = "telegram_stars" | "crypto_bot";

export function openSubscriptionInvoice(
  url: string,
  method: SubscriptionPaymentMethod,
  onStatusChange?: (status: string) => void,
) {
  const webApp = (window as TelegramWebAppWindow).Telegram?.WebApp;

  if (method === "telegram_stars" && webApp?.openInvoice) {
    webApp.openInvoice(url, onStatusChange);
    return;
  }

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return;
  }

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.location.href = url;
}
