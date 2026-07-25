from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel_manager import ChannelManager
from app.models.user import User
from app.schemas.channel_manager import ChannelManagerCreate, ChannelManagerRead
from app.services.channel_access import (
    find_user_by_username,
    get_channel_access_role,
    normalize_username,
)
from app.services.channel_service import _get_owned_channel


async def list_channel_managers(
    db: AsyncSession,
    user: User,
    channel_id: int,
) -> list[ChannelManagerRead]:
    await _get_owned_channel(db, user, channel_id)

    result = await db.execute(
        select(ChannelManager, User)
        .outerjoin(User, User.telegram_id == ChannelManager.manager_telegram_id)
        .where(ChannelManager.channel_id == channel_id)
        .order_by(ChannelManager.created_at.asc())
    )

    return [
        _to_channel_manager_read(manager, linked_user)
        for manager, linked_user in result.all()
    ]


async def add_channel_manager(
    db: AsyncSession,
    user: User,
    channel_id: int,
    manager_data: ChannelManagerCreate,
) -> ChannelManagerRead:
    channel = await _get_owned_channel(db, user, channel_id)
    normalized_username = normalize_username(manager_data.username)

    if normalized_username == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required",
        )

    if user.username is not None and normalized_username == normalize_username(user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as manager",
        )

    existing_result = await db.execute(
        select(ChannelManager).where(
            ChannelManager.channel_id == channel_id,
            ChannelManager.manager_username == normalized_username,
        )
    )

    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manager already added",
        )

    linked_user = await find_user_by_username(db, normalized_username)

    if linked_user is not None and linked_user.telegram_id == channel.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Channel owner cannot be a manager",
        )

    manager = ChannelManager(
        channel_id=channel_id,
        manager_username=normalized_username,
        manager_telegram_id=linked_user.telegram_id if linked_user is not None else None,
    )

    db.add(manager)
    await db.commit()
    await db.refresh(manager)

    return _to_channel_manager_read(manager, linked_user)


async def remove_channel_manager(
    db: AsyncSession,
    user: User,
    channel_id: int,
    manager_id: int,
) -> None:
    await _get_owned_channel(db, user, channel_id)

    result = await db.execute(
        select(ChannelManager).where(
            ChannelManager.id == manager_id,
            ChannelManager.channel_id == channel_id,
        )
    )
    manager = result.scalar_one_or_none()

    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager not found",
        )

    await db.delete(manager)
    await db.commit()


async def leave_channel_as_manager(
    db: AsyncSession,
    user: User,
    channel_id: int,
) -> None:
    access_role = await get_channel_access_role(db, user, channel_id)

    if access_role != "manager":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    result = await db.execute(
        select(ChannelManager).where(
            ChannelManager.channel_id == channel_id,
            ChannelManager.manager_telegram_id == user.telegram_id,
        )
    )
    manager = result.scalar_one_or_none()

    if manager is None and user.username is not None:
        normalized_username = normalize_username(user.username)
        fallback_result = await db.execute(
            select(ChannelManager).where(
                ChannelManager.channel_id == channel_id,
                ChannelManager.manager_username == normalized_username,
            )
        )
        manager = fallback_result.scalar_one_or_none()

    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager assignment not found",
        )

    await db.delete(manager)
    await db.commit()


def _to_channel_manager_read(
    manager: ChannelManager,
    linked_user: User | None,
) -> ChannelManagerRead:
    return ChannelManagerRead(
        id=manager.id,
        channel_id=manager.channel_id,
        username=manager.manager_username,
        first_name=linked_user.first_name if linked_user is not None else None,
        photo_url=linked_user.photo_url if linked_user is not None else None,
    )
