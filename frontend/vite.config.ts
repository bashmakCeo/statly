import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const TELEGRAM_WEB_APP_SCRIPT = "https://telegram.org/js/telegram-web-app.js";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "inject-telegram-web-app",
      transformIndexHtml(html) {
        if (html.includes("telegram-web-app.js")) {
          return html;
        }

        return html.replace(
          "</head>",
          `    <script src="${TELEGRAM_WEB_APP_SCRIPT}"></script>\n  </head>`,
        );
      },
    },
  ],
});
