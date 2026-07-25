from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.models.channel_manager import ChannelManager
from app.models.user import User


def normalize_username(username: str) -> str:
    return username.strip().lstrip("@").lower()


def user_can_access_channel_condition(user: User):
    managed_channel_ids = select(ChannelManager.channel_id).where(
        ChannelManager.manager_telegram_id == user.telegram_id,
    )

    return or_(
        Channel.owner_id == user.telegram_id,
        Channel.id.in_(managed_channel_ids),
    )


async def get_channel_access_role(
    db: AsyncSession,
    user: User,
    channel_id: int,
) -> str | None:
    owner_result = await db.execute(
        select(Channel.id).where(
            Channel.id == channel_id,
            Channel.owner_id == user.telegram_id,
        )
    )

    if owner_result.scalar_one_or_none() is not None:
        return "owner"

    manager_result = await db.execute(
        select(ChannelManager.id).where(
            ChannelManager.channel_id == channel_id,
            ChannelManager.manager_telegram_id == user.telegram_id,
        )
    )

    if manager_result.scalar_one_or_none() is not None:
        return "manager"

    return None


async def link_pending_channel_managers(db: AsyncSession, user: User) -> None:
    if user.username is None:
        return

    normalized_username = normalize_username(user.username)

    await db.execute(
        update(ChannelManager)
        .where(
            ChannelManager.manager_username == normalized_username,
            ChannelManager.manager_telegram_id.is_(None),
        )
        .values(manager_telegram_id=user.telegram_id)
    )
    await db.commit()


async def find_user_by_username(db: AsyncSession, username: str) -> User | None:
    normalized_username = normalize_username(username)
    result = await db.execute(
        select(User).where(func.lower(User.username) == normalized_username)
    )

    return result.scalar_one_or_none()
