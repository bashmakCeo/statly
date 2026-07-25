import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_telegram_message(chat_id: int, text: str) -> bool:
    if not settings.telegram_bot_token:
        return False

    try:
        logger.info(
            "external_request service=telegram action=send_message chat_id=%s",
            chat_id,
        )
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
            data = response.json()
    except httpx.HTTPError:
        logger.exception("Failed to send Telegram message to chat_id=%s", chat_id)
        return False

    if not data.get("ok"):
        logger.warning(
            "Telegram sendMessage failed for chat_id=%s: %s",
            chat_id,
            data.get("description"),
        )
        return False

    return True
