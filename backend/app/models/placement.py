from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Placement(Base):
    __tablename__ = "placements"

    id: Mapped[int] = mapped_column(primary_key=True)

    channel_id: Mapped[int] = mapped_column(ForeignKey("channels.id"), index=True)

    seller_telegram_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.telegram_id"),
        index=True,
    )

    # Данные покупателя храним гибко: Telegram, телефон или произвольный текст.
    buyer_name: Mapped[str] = mapped_column(String(255))
    buyer_contact: Mapped[str | None] = mapped_column(String(255))

    # Денежные поля храним как decimal, чтобы избежать ошибок округления float.
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    # Формат размещения: например 1/24, 3/72 или другой формат из договоренности.
    format: Mapped[str] = mapped_column(String(64))
    # Дата обязательна. Без времени — календарная дата как ввёл пользователь.
    # С временем — publish_date и publish_time хранятся в UTC.
    publish_date: Mapped[date] = mapped_column(Date, index=True)
    publish_time: Mapped[time | None] = mapped_column(Time(timezone=False), nullable=True)

    # Когда отправлено напоминание за 2 часа до публикации (если указано время).
    reminder_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Статус оплаты: paid или unpaid.
    status: Mapped[str] = mapped_column(String(32), default="unpaid")
    comment: Mapped[str | None] = mapped_column(String(1024))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
