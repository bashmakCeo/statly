from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SubscriptionPaymentMethod = Literal["telegram_stars", "crypto_bot"]
SubscriptionPaymentStatus = Literal["pending", "paid", "failed", "expired"]


class SubscriptionPlanRead(BaseModel):
    price_rub: int
    price_label: str
    stars_amount: int


class CreateSubscriptionInvoiceRequest(BaseModel):
    method: SubscriptionPaymentMethod = Field(
        description="Способ оплаты: telegram_stars или crypto_bot",
    )


class SubscriptionInvoiceRead(BaseModel):
    payment_id: int | None = None
    method: SubscriptionPaymentMethod
    price_rub: int
    price_label: str
    invoice_url: str | None
    is_stub: bool
    message: str | None = None


class SubscriptionRead(BaseModel):
    id: int
    plan: str
    started_at: datetime
    expires_at: datetime
    created_at: datetime
    updated_at: datetime


class SubscriptionPaymentRead(BaseModel):
    id: int
    subscription_id: int | None
    provider: SubscriptionPaymentMethod
    invoice_url: str | None
    amount_rub: int
    stars_amount: int | None
    status: SubscriptionPaymentStatus
    payload: str
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ChannelBonusRead(BaseModel):
    eligible: bool
    claimed: bool
    channel_url: str
    channel_title: str
    bonus_days: int
    is_subscribed: bool


class MySubscriptionRead(BaseModel):
    plan: SubscriptionPlanRead
    subscription: SubscriptionRead | None
    free_trial: SubscriptionRead | None
    pro_subscription: SubscriptionRead | None
    free_trial_days: int
    channel_bonus: ChannelBonusRead
    payments: list[SubscriptionPaymentRead]
