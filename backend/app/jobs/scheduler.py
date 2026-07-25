import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.services.placement_reminder_service import process_placement_reminders

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    if not settings.telegram_bot_token:
        logger.info("TELEGRAM_BOT_TOKEN is not set, placement reminder scheduler skipped")
        return

    scheduler.add_job(
        process_placement_reminders,
        trigger="interval",
        minutes=1,
        id="placement_reminders",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(),
    )
    scheduler.start()
    logger.info("Placement reminder scheduler started (every 1 minute)")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Placement reminder scheduler stopped")
