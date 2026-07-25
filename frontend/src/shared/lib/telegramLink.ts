type TelegramWebAppWindow = Window & {
  Telegram?: {
    WebApp?: {
      openLink?: (url: string) => void;
      openTelegramLink?: (url: string) => void;
    };
  };
};

export function openTelegramLink(url: string) {
  const webApp = (window as TelegramWebAppWindow).Telegram?.WebApp;

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return;
  }

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
