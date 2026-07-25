from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChannelManager(Base):
    __tablename__ = "channel_managers"
    __table_args__ = (
        UniqueConstraint("channel_id", "manager_username", name="uq_channel_managers_channel_username"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    channel_id: Mapped[int] = mapped_column(ForeignKey("channels.id"), index=True)
    manager_username: Mapped[str] = mapped_column(String(64), index=True)
    manager_telegram_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.telegram_id"),
        index=True,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
