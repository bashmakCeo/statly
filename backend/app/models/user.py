from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.timezone import DEFAULT_TIMEZONE
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    telegram_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    # Данные Telegram-профиля из Mini App initData.
    username: Mapped[str | None] = mapped_column(String(64))
    first_name: Mapped[str | None] = mapped_column(String(128))
    last_name: Mapped[str | None] = mapped_column(String(128))
    language_code: Mapped[str | None] = mapped_column(String(16))
    photo_url: Mapped[str | None] = mapped_column(String(512))
    is_premium: Mapped[bool] = mapped_column(default=False)

    # Часовой пояс пользователя для дат, времени и уведомлений.
    timezone: Mapped[str] = mapped_column(
        String(64),
        default=DEFAULT_TIMEZONE,
        server_default=DEFAULT_TIMEZONE,
    )

    # Уведомление в Telegram за 2 часа до размещения.
    placement_reminders_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
    )

    # Бонус за подписку на Telegram-канал (один раз на пользователя).
    channel_bonus_claimed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Метаданные входа нужны для активности и базового аудита.
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[str | None] = mapped_column(INET)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    subscriptions = relationship("Subscription", back_populates="user")
    subscription_payments = relationship("SubscriptionPayment", back_populates="user")
