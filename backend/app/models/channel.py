from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Храним Telegram ID владельца, чтобы привязка совпадала с внешней Telegram-идентификацией.
    owner_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.telegram_id"),
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255))
    link: Mapped[str] = mapped_column(String(512))
    picture: Mapped[str | None] = mapped_column(String(512))

    # Мягкое отключение канала без потери истории размещений.
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
