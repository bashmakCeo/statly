import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DEV_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://statly-crm.online",
    "http://statly-crm.online",
]
DEV_CORS_ORIGIN_REGEX = (
    r"^http://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+"
    r"|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+):5173$"
)


def _int_env(name: str, default: int) -> int:
    # Пустая строка в .env = значение не задано.
    value = os.getenv(name)
    if not value:
        return default
    return int(value)


class Settings:
    app_title: str = "Statly API"
    app_env: str = os.getenv("APP_ENV", "development").lower()
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://localhost:5432/statly",
    )
    telegram_bot_token: str | None = os.getenv("TELEGRAM_BOT_TOKEN") or None
    telegram_admin_telegram_id: int = _int_env("TELEGRAM_ADMIN_TELEGRAM_ID", 0)
    telegram_web_app_url: str = os.getenv(
        "TELEGRAM_WEB_APP_URL",
        "https://statly-crm.online",
    )
    crypto_pay_api_token: str | None = os.getenv("CRYPTO_PAY_API_TOKEN") or None
    subscription_price_rub: int = _int_env("SUBSCRIPTION_PRICE_RUB", 500)
    subscription_stars_amount: int = _int_env("SUBSCRIPTION_STARS_AMOUNT", 500)
    subscription_free_trial_days: int = _int_env("SUBSCRIPTION_FREE_TRIAL_DAYS", 14)
    telegram_channel_bonus_id: int = _int_env("TELEGRAM_CHANNEL_BONUS_ID", 0)
    telegram_channel_bonus_url: str = os.getenv("TELEGRAM_CHANNEL_BONUS_URL", "")
    telegram_channel_bonus_title: str = os.getenv("TELEGRAM_CHANNEL_BONUS_TITLE", "")
    telegram_channel_bonus_days: int = _int_env("TELEGRAM_CHANNEL_BONUS_DAYS", 5)
    crypto_pay_api_base_url: str = os.getenv(
        "CRYPTO_PAY_API_BASE_URL",
        "https://pay.crypt.bot/api",
    )
    allow_insecure_init_data: bool = (
        os.getenv("ALLOW_INSECURE_INIT_DATA", "true").lower() == "true"
    )

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_allowed_origins(self) -> list[str]:
        if self.is_production:
            return ["https://statly-crm.online"]
        return DEV_CORS_ORIGINS

    @property
    def cors_allowed_origin_regex(self) -> str | None:
        if self.is_production:
            return None
        return DEV_CORS_ORIGIN_REGEX

    @property
    def cors_allow_credentials(self) -> bool:
        return not self.is_production

    @property
    def cors_allowed_methods(self) -> list[str]:
        if self.is_production:
            return ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
        return ["*"]

    @property
    def cors_allowed_headers(self) -> list[str]:
        if self.is_production:
            return ["Content-Type", "X-Telegram-Init-Data"]
        return ["*"]


settings = Settings()
