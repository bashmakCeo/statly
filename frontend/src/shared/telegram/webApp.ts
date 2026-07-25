const TELEGRAM_WEB_APP_SCRIPT = "https://telegram.org/js/telegram-web-app.js";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

let initData: string | null = null;

function getTelegramWindow(): TelegramWindow {
  return window as TelegramWindow;
}

function loadTelegramScript(): Promise<void> {
  const existing = getTelegramWindow().Telegram?.WebApp;
  if (existing) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${TELEGRAM_WEB_APP_SCRIPT}"]`,
  );

  if (existingScript?.dataset.loaded === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => resolve();
    const onError = () => reject(new Error("Failed to load Telegram WebApp SDK"));

    if (existingScript) {
      existingScript.addEventListener("load", onReady, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = TELEGRAM_WEB_APP_SCRIPT;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        onReady();
      },
      { once: true },
    );
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });
}

export async function initTelegramWebApp(): Promise<void> {
  if (import.meta.env.DEV) {
    const { getDevInitData } = await import("./devUsers");
    initData = getDevInitData();
    return;
  }

  await loadTelegramScript();

  const webApp = getTelegramWindow().Telegram?.WebApp;
  if (!webApp) {
    throw new Error("Telegram WebApp is unavailable. Open the app from the bot.");
  }

  webApp.ready();
  webApp.expand?.();
  webApp.disableVerticalSwipes?.();

  const rawInitData = webApp.initData.trim();
  if (!rawInitData) {
    throw new Error("Telegram initData is empty. Open the app from the bot.");
  }

  initData = rawInitData;
}

export function getInitData(): string {
  if (initData !== null) {
    return initData;
  }

  if (import.meta.env.DEV) {
    throw new Error("Telegram dev initData is not initialized");
  }

  return getTelegramWindow().Telegram?.WebApp?.initData.trim() ?? "";
}
