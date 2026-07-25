import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

CHANNEL_MEMBER_STATUSES = frozenset({"creator", "administrator", "member"})


async def get_chat_member_status(*, chat_id: int, user_id: int) -> str | None:
    if not settings.telegram_bot_token:
        return None

    try:
        logger.info(
            "external_request service=telegram action=get_chat_member chat_id=%s user_id=%s",
            chat_id,
            user_id,
        )
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/getChatMember",
                json={"chat_id": chat_id, "user_id": user_id},
            )
            data: dict[str, Any] = response.json()
    except httpx.HTTPError:
        logger.exception(
            "Failed to get chat member status for chat_id=%s user_id=%s",
            chat_id,
            user_id,
        )
        return None

    if not data.get("ok"):
        logger.warning(
            "Telegram getChatMember failed for chat_id=%s user_id=%s: %s",
            chat_id,
            user_id,
            data.get("description"),
        )
        return None

    result = data.get("result")
    if not isinstance(result, dict):
        return None

    status = result.get("status")
    return status if isinstance(status, str) else None


async def is_user_subscribed_to_chat(*, chat_id: int, user_id: int) -> bool:
    status = await get_chat_member_status(chat_id=chat_id, user_id=user_id)
    return status in CHANNEL_MEMBER_STATUSES
