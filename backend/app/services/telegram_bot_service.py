import logging
from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    PreCheckoutQuery,
    WebAppInfo,
)
from aiogram.types import User as AiogramUser
from aiogram.types.error_event import ErrorEvent

from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.telegram.auth import TelegramUserData
from app.services.admin_stats_service import format_admin_stats_message, get_admin_stats
from app.services.auth_service import upsert_user_from_telegram
from app.services.subscription_service import (
    activate_subscription_from_payment,
    is_subscription_payment_ready,
)

logger = logging.getLogger(__name__)


async def run_telegram_long_polling() -> None:
    if not settings.telegram_bot_token:
        logger.info("TELEGRAM_BOT_TOKEN is not set, Telegram long polling skipped")
        return

    bot = Bot(token=settings.telegram_bot_token)
    dispatcher = Dispatcher()
    dispatcher.message.outer_middleware(_log_telegram_action)
    dispatcher.pre_checkout_query.outer_middleware(_log_telegram_action)
    dispatcher.message.register(_handle_start_message, CommandStart())
    dispatcher.message.register(_handle_panel_command, Command("panel"))
    dispatcher.message.register(_handle_successful_payment, F.successful_payment)
    dispatcher.pre_checkout_query.register(_handle_pre_checkout_query)
    dispatcher.errors.register(_handle_telegram_error)

    logger.info("Telegram long polling started")

    try:
        await dispatcher.start_polling(
            bot,
            allowed_updates=["message", "pre_checkout_query"],
            handle_signals=False,
        )
    except Exception:
        logger.exception("telegram_polling_failed")
        raise
    finally:
        await bot.session.close()
        logger.info("Telegram long polling stopped")


async def _handle_start_message(message: Message) -> None:
    if message.from_user is None:
        return

    telegram_user = _telegram_user_from_aiogram_user(message.from_user)

    async with SessionLocal() as db:
        await upsert_user_from_telegram(
            db=db,
            telegram_user=telegram_user,
            ip_address=None,
        )

    first_name = telegram_user.first_name or "друг"
    await message.answer(
        text=(
            f"Привет, {first_name}!\n\n"
            "Statly CRM помогает вести каналы, размещения и аналитику.\n"
            "Нажми кнопку ниже, чтобы открыть приложение."
        ),
        reply_markup=_build_web_app_reply_markup(),
    )


async def _handle_panel_command(message: Message) -> None:
    if message.from_user is None:
        return

    # Команда только для админа — остальным не отвечаем.
    if message.from_user.id != settings.telegram_admin_telegram_id:
        return

    logger.info("admin_action user_id=%s action=panel", message.from_user.id)
    async with SessionLocal() as db:
        stats = await get_admin_stats(db=db)

    await message.answer(format_admin_stats_message(stats))


async def _handle_pre_checkout_query(pre_checkout_query: PreCheckoutQuery) -> None:
    payload = pre_checkout_query.invoice_payload

    if not payload:
        return

    async with SessionLocal() as db:
        is_ready = await is_subscription_payment_ready(db=db, payload=payload)

    logger.info(
        "payment_pre_checkout user_id=%s status=%s",
        pre_checkout_query.from_user.id,
        "ready" if is_ready else "rejected",
    )
    await pre_checkout_query.answer(
        ok=is_ready,
        error_message=None if is_ready else "Счёт не найден или уже обработан",
    )


async def _handle_successful_payment(message: Message) -> None:
    if message.successful_payment is None:
        return

    payload = message.successful_payment.invoice_payload

    if not payload:
        return

    async with SessionLocal() as db:
        await activate_subscription_from_payment(db=db, payload=payload)

    logger.info("payment_completed user_id=%s", message.from_user.id)


async def _log_telegram_action(
    handler: Callable[[Any, dict[str, Any]], Awaitable[Any]],
    event: Message | PreCheckoutQuery,
    data: dict[str, Any],
) -> Any:
    user = event.from_user
    payload = event.text if isinstance(event, Message) else "pre_checkout"
    logger.info(
        "user_action user_id=%s action=%s payload=%r",
        user.id,
        event.__class__.__name__,
        _short_payload(payload),
    )
    return await handler(event, data)


async def _handle_telegram_error(event: ErrorEvent) -> None:
    user_id = _get_error_event_user_id(event)

    try:
        raise event.exception
    except Exception:
        logger.exception("telegram_update_failed user_id=%s", user_id)


def _get_error_event_user_id(event: ErrorEvent) -> int | None:
    for field_name in ("message", "callback_query", "pre_checkout_query"):
        update_event = getattr(event.update, field_name, None)
        user = getattr(update_event, "from_user", None)
        if user is not None:
            return user.id
    return None


def _short_payload(value: str | None) -> str:
    return (value or "")[:80]

def _telegram_user_from_aiogram_user(user: AiogramUser) -> TelegramUserData:
    return TelegramUserData(
        telegram_id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        language_code=user.language_code,
        photo_url=None,
        is_premium=bool(user.is_premium),
    )


def _build_web_app_reply_markup() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть Statly",
                    web_app=WebAppInfo(url=settings.telegram_web_app_url),
                )
            ]
        ]
    )
