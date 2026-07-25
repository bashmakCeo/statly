from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_telegram_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.telegram_id"),
        index=True,
    )
    subscription_id: Mapped[int | None] = mapped_column(
        ForeignKey("subscriptions.id"),
        nullable=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(32), index=True)
    invoice_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    amount_rub: Mapped[int] = mapped_column(Integer)
    stars_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default="pending")
    payload: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="subscription_payments")
    subscription = relationship("Subscription", back_populates="payments")
