import calendar
import logging
from datetime import UTC, datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.subscription import Subscription
from app.models.subscription_payment import SubscriptionPayment
from app.models.user import User
from app.schemas.subscription import (
    ChannelBonusRead,
    CreateSubscriptionInvoiceRequest,
    MySubscriptionRead,
    SubscriptionInvoiceRead,
    SubscriptionPaymentMethod,
    SubscriptionPaymentRead,
    SubscriptionPlanRead,
    SubscriptionRead,
)
from app.services.telegram_api_service import is_user_subscribed_to_chat

logger = logging.getLogger(__name__)

SUBSCRIPTION_REQUIRED_DETAIL = "Подписка истекла. Оформите PRO, чтобы продолжить."


def get_subscription_plan() -> SubscriptionPlanRead:
    price_rub = settings.subscription_price_rub
    return SubscriptionPlanRead(
        price_rub=price_rub,
        price_label=f"{price_rub} ₽ / месяц",
        stars_amount=settings.subscription_stars_amount,
    )


def _stub_invoice(
    *,
    method: SubscriptionPaymentMethod,
    message: str,
    payment_id: int | None = None,
) -> SubscriptionInvoiceRead:
    plan = get_subscription_plan()
    return SubscriptionInvoiceRead(
        payment_id=payment_id,
        method=method,
        price_rub=plan.price_rub,
        price_label=plan.price_label,
        invoice_url=None,
        is_stub=True,
        message=message,
    )


async def create_subscription_invoice(
    *,
    db: AsyncSession,
    user: User,
    payload: CreateSubscriptionInvoiceRequest,
) -> SubscriptionInvoiceRead:
    if payload.method == "telegram_stars":
        return await _create_telegram_stars_invoice(db, user)

    return await _create_crypto_bot_invoice(db, user)


async def ensure_free_trial_for_new_user(*, db: AsyncSession, user: User) -> None:
    free_trial = await _get_latest_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
        plan="free",
    )
    if free_trial is not None:
        return

    now = datetime.now(UTC)
    db.add(
        Subscription(
            user_telegram_id=user.telegram_id,
            plan="free",
            started_at=now,
            expires_at=now + timedelta(days=settings.subscription_free_trial_days),
        )
    )
    await db.commit()


async def user_has_active_subscription(
    *,
    db: AsyncSession,
    user_telegram_id: int,
) -> bool:
    pro = await _get_active_subscription(
        db=db,
        user_telegram_id=user_telegram_id,
        plan="pro",
    )
    if pro is not None:
        return True

    free = await _get_active_subscription(
        db=db,
        user_telegram_id=user_telegram_id,
        plan="free",
    )
    return free is not None


async def ensure_active_subscription(*, db: AsyncSession, user: User) -> None:
    if not await user_has_active_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SUBSCRIPTION_REQUIRED_DETAIL,
        )


async def ensure_active_subscription_for_channel(
    *,
    db: AsyncSession,
    user: User,
    channel_id: int,
) -> None:
    from app.models.channel import Channel
    from app.services.channel_access import get_channel_access_role

    access_role = await get_channel_access_role(db, user, channel_id)
    if access_role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    billing_telegram_id = user.telegram_id
    if access_role == "manager":
        owner_id = await db.scalar(
            select(Channel.owner_id).where(Channel.id == channel_id)
        )
        if owner_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found",
            )
        billing_telegram_id = owner_id

    if not await user_has_active_subscription(
        db=db,
        user_telegram_id=billing_telegram_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SUBSCRIPTION_REQUIRED_DETAIL,
        )


async def get_my_subscription(*, db: AsyncSession, user: User) -> MySubscriptionRead:
    payments_result = await db.execute(
        select(SubscriptionPayment)
        .where(SubscriptionPayment.user_telegram_id == user.telegram_id)
        .order_by(SubscriptionPayment.created_at.desc())
        .limit(20)
    )

    pro_active = await _get_active_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
        plan="pro",
    )
    free_active = await _get_active_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
        plan="free",
    )
    free_latest = await _get_latest_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
        plan="free",
    )
    active_subscription = pro_active or free_active
    channel_bonus = await _build_channel_bonus_read(db=db, user=user)

    return MySubscriptionRead(
        plan=get_subscription_plan(),
        subscription=_subscription_read(active_subscription),
        free_trial=_subscription_read(free_latest),
        pro_subscription=_subscription_read(pro_active),
        free_trial_days=settings.subscription_free_trial_days,
        channel_bonus=channel_bonus,
        payments=[_payment_read(payment) for payment in payments_result.scalars().all()],
    )


async def claim_channel_bonus(*, db: AsyncSession, user: User) -> MySubscriptionRead:
    if user.channel_bonus_claimed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Бонус за подписку на канал уже получен",
        )

    if await user_has_active_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Подписка уже активна",
        )

    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Проверка подписки на канал временно недоступна",
        )

    is_subscribed = await is_user_subscribed_to_chat(
        chat_id=settings.telegram_channel_bonus_id,
        user_id=user.telegram_id,
    )
    if not is_subscribed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Подпишитесь на канал, чтобы получить бонус",
        )

    now = datetime.now(UTC)
    free_subscription = await _get_latest_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
        plan="free",
    )
    bonus_expires_at = now + timedelta(days=settings.telegram_channel_bonus_days)

    if free_subscription is None:
        db.add(
            Subscription(
                user_telegram_id=user.telegram_id,
                plan="free",
                started_at=now,
                expires_at=bonus_expires_at,
            )
        )
    else:
        base = max(now, free_subscription.expires_at)
        free_subscription.expires_at = base + timedelta(
            days=settings.telegram_channel_bonus_days,
        )

    user.channel_bonus_claimed_at = now
    await db.commit()
    await db.refresh(user)

    return await get_my_subscription(db=db, user=user)


async def _build_channel_bonus_read(*, db: AsyncSession, user: User) -> ChannelBonusRead:
    claimed = user.channel_bonus_claimed_at is not None
    has_active = await user_has_active_subscription(
        db=db,
        user_telegram_id=user.telegram_id,
    )
    is_subscribed = False

    if (
        not claimed
        and not has_active
        and settings.telegram_bot_token
    ):
        is_subscribed = await is_user_subscribed_to_chat(
            chat_id=settings.telegram_channel_bonus_id,
            user_id=user.telegram_id,
        )

    eligible = not claimed and not has_active

    return ChannelBonusRead(
        eligible=eligible,
        claimed=claimed,
        channel_url=settings.telegram_channel_bonus_url,
        channel_title=settings.telegram_channel_bonus_title,
        bonus_days=settings.telegram_channel_bonus_days,
        is_subscribed=is_subscribed,
    )


async def is_subscription_payment_ready(*, db: AsyncSession, payload: str) -> bool:
    payment = await _get_payment_by_payload(db=db, payload=payload)
    return (
        payment is not None
        and payment.provider == "telegram_stars"
        and payment.status == "pending"
    )


async def activate_subscription_from_payment(
    *,
    db: AsyncSession,
    payload: str,
) -> SubscriptionPayment | None:
    payment = await _get_payment_by_payload(db=db, payload=payload)
    if (
        payment is None
        or payment.provider != "telegram_stars"
        or payment.status != "pending"
    ):
        return payment

    return await _activate_subscription_for_payment(db=db, payment=payment)


async def activate_crypto_subscription_from_payment(
    *,
    db: AsyncSession,
    payload: str,
) -> SubscriptionPayment | None:
    payment = await _get_payment_by_payload(db=db, payload=payload)
    if (
        payment is None
        or payment.provider != "crypto_bot"
        or payment.status != "pending"
    ):
        return payment

    return await _activate_subscription_for_payment(db=db, payment=payment)


async def _activate_subscription_for_payment(
    *,
    db: AsyncSession,
    payment: SubscriptionPayment,
) -> SubscriptionPayment:
    now = datetime.now(timezone.utc)
    subscription = await _get_active_subscription(
        db=db,
        user_telegram_id=payment.user_telegram_id,
        plan="pro",
    )

    if subscription is None:
        subscription = Subscription(
            user_telegram_id=payment.user_telegram_id,
            plan="pro",
            started_at=now,
            expires_at=_add_one_month(now),
        )
        db.add(subscription)
        await db.flush()
    else:
        subscription.expires_at = _add_one_month(subscription.expires_at)

    payment.status = "paid"
    payment.paid_at = now
    payment.subscription_id = subscription.id

    await db.commit()
    await db.refresh(payment)
    logger.info(
        "subscription_activated user_id=%s provider=%s payment_id=%s",
        payment.user_telegram_id,
        payment.provider,
        payment.id,
    )
    return payment


async def answer_pre_checkout_query(
    *,
    pre_checkout_query_id: str,
    ok: bool,
    error_message: str | None = None,
) -> bool:
    if not settings.telegram_bot_token:
        return False

    request_body: dict[str, Any] = {
        "pre_checkout_query_id": pre_checkout_query_id,
        "ok": ok,
    }
    if error_message is not None:
        request_body["error_message"] = error_message

    try:
        logger.info("external_request service=telegram action=answer_pre_checkout")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/answerPreCheckoutQuery",
                json=request_body,
            )
    except httpx.HTTPError:
        logger.exception("external_request_failed service=telegram action=answer_pre_checkout")
        return False

    data = response.json()
    return bool(data.get("ok"))


async def _create_telegram_stars_invoice(
    db: AsyncSession,
    user: User,
) -> SubscriptionInvoiceRead:
    if not settings.telegram_bot_token:
        return _stub_invoice(
            method="telegram_stars",
            message=(
                "Оплата через Telegram Stars скоро будет доступна. "
                "Токен бота ещё не подключён."
            ),
        )

    plan = get_subscription_plan()
    payment = await _create_pending_payment(
        db=db,
        user=user,
        method="telegram_stars",
    )
    request_body = {
        "title": "Statly PRO",
        "description": "Подписка PRO на 1 месяц",
        "payload": payment.payload,
        "currency": "XTR",
        "prices": [
            {
                "label": "Подписка PRO на 1 месяц",
                "amount": settings.subscription_stars_amount,
            },
        ],
    }

    try:
        logger.info(
            "external_request service=telegram action=create_invoice user_id=%s",
            user.telegram_id,
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/createInvoiceLink",
                json=request_body,
            )
    except httpx.HTTPError as error:
        logger.exception(
            "external_request_failed service=telegram action=create_invoice user_id=%s",
            user.telegram_id,
        )
        await _mark_payment_failed(db=db, payment=payment)
        return _stub_invoice(
            method="telegram_stars",
            message=f"Не удалось создать счёт в Telegram: {error}",
            payment_id=payment.id,
        )

    data = response.json()
    if not data.get("ok"):
        await _mark_payment_failed(db=db, payment=payment)
        return _stub_invoice(
            method="telegram_stars",
            message=_telegram_api_error_message(data),
            payment_id=payment.id,
        )

    invoice_url = data.get("result")
    if not isinstance(invoice_url, str) or not invoice_url:
        await _mark_payment_failed(db=db, payment=payment)
        return _stub_invoice(
            method="telegram_stars",
            message="Telegram не вернул ссылку на счёт",
            payment_id=payment.id,
        )

    payment.invoice_url = invoice_url
    await db.commit()
    await db.refresh(payment)

    return SubscriptionInvoiceRead(
        payment_id=payment.id,
        method="telegram_stars",
        price_rub=plan.price_rub,
        price_label=plan.price_label,
        invoice_url=invoice_url,
        is_stub=False,
    )


async def _create_crypto_bot_invoice(
    db: AsyncSession,
    user: User,
) -> SubscriptionInvoiceRead:
    if not settings.crypto_pay_api_token:
        return _stub_invoice(
            method="crypto_bot",
            message=(
                "Оплата через Crypto Bot скоро будет доступна. "
                "Токен Crypto Pay ещё не подключён."
            ),
        )

    plan = get_subscription_plan()
    payment = await _create_pending_payment(
        db=db,
        user=user,
        method="crypto_bot",
    )
    request_body = {
        "currency_type": "fiat",
        "fiat": "RUB",
        "amount": f"{plan.price_rub:.2f}",
        "description": "Подписка PRO на 1 месяц",
        "payload": payment.payload,
    }

    try:
        logger.info(
            "external_request service=crypto_pay action=create_invoice user_id=%s",
            user.telegram_id,
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.crypto_pay_api_base_url.rstrip('/')}/createInvoice",
                headers={"Crypto-Pay-API-Token": settings.crypto_pay_api_token},
                json=request_body,
            )
    except httpx.HTTPError as error:
        logger.exception(
            "external_request_failed service=crypto_pay action=create_invoice user_id=%s",
            user.telegram_id,
        )
        await _mark_payment_failed(db=db, payment=payment)
        return _stub_invoice(
            method="crypto_bot",
            message=f"Не удалось создать счёт в Crypto Pay: {error}",
            payment_id=payment.id,
        )

    data = response.json()
    if not data.get("ok"):
        await _mark_payment_failed(db=db, payment=payment)
        return _stub_invoice(
            method="crypto_bot",
            message=_crypto_pay_error_message(data),
            payment_id=payment.id,
        )

    result = data.get("result")
    if not isinstance(result, dict):
        await _mark_payment_failed(db=db, payment=payment)
        return _stub_invoice(
            method="crypto_bot",
            message="Crypto Pay не вернул данные счёта",
            payment_id=payment.id,
        )

    invoice_url = (
        result.get("bot_invoice_url")
        or result.get("mini_app_invoice_url")
        or result.get("web_app_invoice_url")
    )
    if not isinstance(invoice_url, str) or not invoice_url:
        await _mark_payment_failed(db=db, payment=payment)
        return _stub_invoice(
            method="crypto_bot",
            message="Crypto Pay не вернул ссылку на счёт",
            payment_id=payment.id,
        )

    payment.invoice_url = invoice_url
    await db.commit()
    await db.refresh(payment)

    return SubscriptionInvoiceRead(
        payment_id=payment.id,
        method="crypto_bot",
        price_rub=plan.price_rub,
        price_label=plan.price_label,
        invoice_url=invoice_url,
        is_stub=False,
    )


async def _create_pending_payment(
    *,
    db: AsyncSession,
    user: User,
    method: SubscriptionPaymentMethod,
) -> SubscriptionPayment:
    plan = get_subscription_plan()
    payment = SubscriptionPayment(
        user_telegram_id=user.telegram_id,
        provider=method,
        invoice_url=None,
        amount_rub=plan.price_rub,
        stars_amount=(
            plan.stars_amount if method == "telegram_stars" else None
        ),
        status="pending",
        payload=f"pending:{user.telegram_id}:{datetime.now(timezone.utc).timestamp()}",
    )
    db.add(payment)
    await db.flush()

    payment.payload = _build_invoice_payload(payment=payment, user=user)
    await db.flush()
    return payment


async def _mark_payment_failed(
    *,
    db: AsyncSession,
    payment: SubscriptionPayment,
) -> None:
    payment.status = "failed"
    await db.commit()


def _build_invoice_payload(*, payment: SubscriptionPayment, user: User) -> str:
    return f"subscription:pro:{payment.id}:{user.telegram_id}"


async def _get_active_subscription(
    *,
    db: AsyncSession,
    user_telegram_id: int,
    plan: str,
) -> Subscription | None:
    now = datetime.now(UTC)
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_telegram_id == user_telegram_id,
            Subscription.plan == plan,
            Subscription.expires_at > now,
        )
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_latest_subscription(
    *,
    db: AsyncSession,
    user_telegram_id: int,
    plan: str,
) -> Subscription | None:
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_telegram_id == user_telegram_id,
            Subscription.plan == plan,
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_payment_by_payload(
    *,
    db: AsyncSession,
    payload: str,
) -> SubscriptionPayment | None:
    result = await db.execute(
        select(SubscriptionPayment).where(SubscriptionPayment.payload == payload).limit(1)
    )
    return result.scalar_one_or_none()


def _add_one_month(value: datetime) -> datetime:
    month = value.month + 1
    year = value.year

    if month > 12:
        month = 1
        year += 1

    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def _subscription_read(subscription: Subscription | None) -> SubscriptionRead | None:
    if subscription is None:
        return None

    return SubscriptionRead(
        id=subscription.id,
        plan=subscription.plan,
        started_at=subscription.started_at,
        expires_at=subscription.expires_at,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at,
    )


def _payment_read(payment: SubscriptionPayment) -> SubscriptionPaymentRead:
    return SubscriptionPaymentRead(
        id=payment.id,
        subscription_id=payment.subscription_id,
        provider=payment.provider,
        invoice_url=payment.invoice_url,
        amount_rub=payment.amount_rub,
        stars_amount=payment.stars_amount,
        status=payment.status,
        payload=payment.payload,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )


def _telegram_api_error_message(data: dict[str, Any]) -> str:
    description = data.get("description")
    if isinstance(description, str) and description:
        return f"Telegram API: {description}"
    return "Не удалось создать счёт в Telegram"


def _crypto_pay_error_message(data: dict[str, Any]) -> str:
    error = data.get("error")
    if isinstance(error, dict):
        name = error.get("name")
        code = error.get("code")
        if isinstance(name, str) and name:
            if isinstance(code, int):
                return f"Crypto Pay: {name} ({code})"
            return f"Crypto Pay: {name}"

    return "Не удалось создать счёт в Crypto Pay"
