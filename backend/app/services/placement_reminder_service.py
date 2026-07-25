import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from html import escape
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.placement_datetime import storage_publish_utc_datetime
from app.core.timezone import get_zoneinfo
from app.db.session import SessionLocal
from app.models.channel import Channel
from app.models.channel_manager import ChannelManager
from app.models.placement import Placement
from app.models.user import User
from app.services.telegram_notify_service import send_telegram_message

logger = logging.getLogger(__name__)

REMINDER_LEAD_TIME = timedelta(hours=2)


async def process_placement_reminders() -> None:
    if not _can_send_reminders():
        return

    async with SessionLocal() as db:
        rows = await _fetch_pending_placements(db)

        if not rows:
            return

        logger.info("reminder_scan_started candidates=%s", len(rows))

        now = datetime.now(UTC)
        sent_count = 0
        failed_count = 0

        for placement, channel, owner in rows:
            owner_timezone = get_zoneinfo(owner.timezone)
            sent, failed = await _process_single_placement(
                db,
                placement,
                channel,
                now,
                owner_timezone,
            )
            sent_count += sent
            failed_count += failed

        logger.info(
            "reminder_scan_finished sent=%s failed=%s",
            sent_count,
            failed_count,
        )


def _can_send_reminders() -> bool:
    from app.core.config import settings

    if settings.telegram_bot_token:
        return True

    logger.debug("TELEGRAM_BOT_TOKEN is not set, placement reminders skipped")
    return False


async def _fetch_pending_placements(
    db: AsyncSession,
) -> list[tuple[Placement, Channel, User]]:
    result = await db.execute(
        select(Placement, Channel, User)
        .join(Channel, Channel.id == Placement.channel_id)
        .join(User, User.telegram_id == Channel.owner_id)
        .where(
            Placement.publish_time.is_not(None),
            Placement.reminder_sent_at.is_(None),
            Channel.is_active.is_(True),
        )
    )
    return list(result.all())


async def _process_single_placement(
    db: AsyncSession,
    placement: Placement,
    channel: Channel,
    now: datetime,
    owner_timezone: ZoneInfo,
) -> tuple[int, int]:
    if placement.publish_time is None:
        return 0, 0

    publish_at = storage_publish_utc_datetime(
        publish_date=placement.publish_date,
        publish_time=placement.publish_time,
    )
    notify_at = publish_at - REMINDER_LEAD_TIME

    if now < notify_at or now >= publish_at:
        return 0, 0

    manager_telegram_ids = await _fetch_manager_telegram_ids(db, channel.id)
    recipients = await _fetch_enabled_recipient_telegram_ids(
        db,
        channel,
        manager_telegram_ids,
    )

    if not recipients:
        logger.info(
            "No enabled recipients for placement reminder id=%s channel_id=%s",
            placement.id,
            placement.channel_id,
        )
        placement.reminder_sent_at = datetime.now(UTC)
        await db.commit()
        return 0, 0

    publish_at_local = publish_at.astimezone(owner_timezone)
    message = _build_reminder_message(placement, channel, publish_at_local)
    sent_count = 0
    failed_count = 0

    for telegram_id in recipients:
        if await send_telegram_message(telegram_id, message):
            sent_count += 1
        else:
            failed_count += 1

    if sent_count == 0:
        logger.warning(
            "Failed to deliver placement reminder id=%s to any recipient",
            placement.id,
        )
        return sent_count, failed_count

    placement.reminder_sent_at = datetime.now(UTC)
    await db.commit()
    logger.info(
        "Sent 2-hour placement reminder id=%s to %s recipient(s)",
        placement.id,
        len(recipients),
    )
    return sent_count, failed_count


async def _fetch_manager_telegram_ids(db: AsyncSession, channel_id: int) -> list[int]:
    result = await db.execute(
        select(ChannelManager.manager_telegram_id).where(
            ChannelManager.channel_id == channel_id,
            ChannelManager.manager_telegram_id.is_not(None),
        )
    )
    return [telegram_id for telegram_id in result.scalars() if telegram_id is not None]


async def _fetch_enabled_recipient_telegram_ids(
    db: AsyncSession,
    channel: Channel,
    manager_telegram_ids: list[int],
) -> list[int]:
    recipient_ids = {channel.owner_id, *manager_telegram_ids}

    result = await db.execute(
        select(User.telegram_id).where(
            User.telegram_id.in_(recipient_ids),
            User.placement_reminders_enabled.is_(True),
        )
    )
    return sorted({telegram_id for telegram_id in result.scalars()})


def _build_reminder_message(
    placement: Placement,
    channel: Channel,
    publish_at: datetime,
) -> str:
    status_label = "оплачено" if placement.status == "paid" else "не оплачено"
    buyer_contact = escape(placement.buyer_contact or "—")
    buyer_name = escape(placement.buyer_name)
    channel_title = escape(channel.title)
    placement_format = escape(placement.format)
    comment_block = (
        f"\n💬 {escape(placement.comment.strip())}"
        if placement.comment and placement.comment.strip()
        else ""
    )

    return (
        "⏰ <b>Напоминание о размещении</b>\n\n"
        f"Через 2 часа выходит пост в канале «{channel_title}».\n\n"
        f"📅 {_format_publish_datetime(publish_at)}\n"
        f"📋 Формат: {placement_format}\n"
        f"👤 {buyer_name} ({buyer_contact})\n"
        f"💰 {_format_price(placement.price)} · {status_label}"
        f"{comment_block}"
    )


def _format_publish_datetime(publish_at: datetime) -> str:
    return publish_at.strftime("%d.%m.%Y в %H:%M")


def _format_price(price: Decimal) -> str:
    normalized = price.quantize(Decimal("0.01"))
    if normalized == normalized.to_integral_value():
        return f"{normalized.to_integral_value():,.0f} ₽".replace(",", " ")
    return f"{normalized:,.2f} ₽".replace(",", " ")
