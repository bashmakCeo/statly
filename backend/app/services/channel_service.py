from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.models.channel_manager import ChannelManager
from app.models.placement import Placement
from app.models.user import User
from app.schemas.channel import ChannelCreate, ChannelRead, ChannelUpdate
from app.services.channel_access import get_channel_access_role
from app.services.image_processing import process_channel_picture
from app.services.subscription_service import (
    ensure_active_subscription,
    user_has_active_subscription,
)

CHANNEL_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "channels"
CHANNEL_UPLOADS_ROUTE = "/uploads/channels"
MAX_CHANNEL_PICTURE_UPLOAD_BYTES = 15 * 1024 * 1024


async def list_user_channels(db: AsyncSession, user: User) -> list[ChannelRead]:
    owned_statement = _channels_with_placements_count().where(
        Channel.owner_id == user.telegram_id,
        Channel.is_active.is_(True),
    )
    owned_result = await db.execute(owned_statement)
    owned_channels = [
        _to_channel_read(channel, count, "owner", owner)
        for channel, count, owner in owned_result.all()
    ]

    managed_statement = (
        _channels_with_placements_count()
        .join(ChannelManager, ChannelManager.channel_id == Channel.id)
        .where(
            ChannelManager.manager_telegram_id == user.telegram_id,
            Channel.is_active.is_(True),
        )
    )
    managed_result = await db.execute(managed_statement)
    managed_rows = managed_result.all()
    owner_subscription_active_by_id = await _owner_subscription_active_map(
        db,
        [owner.telegram_id for _, _, owner in managed_rows],
    )
    managed_channels = [
        _to_channel_read(
            channel,
            count,
            "manager",
            owner,
            owner_subscription_active=owner_subscription_active_by_id.get(
                owner.telegram_id,
                False,
            ),
        )
        for channel, count, owner in managed_rows
    ]

    return owned_channels + managed_channels


async def list_user_channels_by_owner(
    db: AsyncSession,
    owner_id: int,
) -> list[ChannelRead]:
    statement = _channels_with_placements_count().where(
        Channel.owner_id == owner_id,
        Channel.is_active.is_(True),
    )
    result = await db.execute(statement)

    return [_to_channel_read(channel, count, "owner", owner) for channel, count, owner in result.all()]


async def get_user_channel(
    db: AsyncSession,
    user: User,
    channel_id: int,
) -> ChannelRead:
    access_role = await get_channel_access_role(db, user, channel_id)

    if access_role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    statement = _channels_with_placements_count().where(Channel.id == channel_id)
    result = await db.execute(statement)
    row = result.one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    channel, placements_count, owner = row
    owner_subscription_active = None
    if access_role == "manager" and owner is not None:
        owner_subscription_active = await user_has_active_subscription(
            db=db,
            user_telegram_id=owner.telegram_id,
        )

    return _to_channel_read(
        channel,
        placements_count,
        access_role,
        owner,
        owner_subscription_active=owner_subscription_active,
    )


async def get_user_channel_by_owner(
    db: AsyncSession,
    owner_id: int,
    channel_id: int,
) -> ChannelRead:
    statement = _channels_with_placements_count().where(
        Channel.id == channel_id,
        Channel.owner_id == owner_id,
    )
    result = await db.execute(statement)
    row = result.one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    channel, placements_count, owner = row
    return _to_channel_read(channel, placements_count, "owner", owner)


async def create_user_channel(
    db: AsyncSession,
    user: User,
    channel_data: ChannelCreate,
) -> ChannelRead:
    await ensure_active_subscription(db=db, user=user)

    channel = Channel(
        owner_id=user.telegram_id,
        title=channel_data.title,
        link=channel_data.link,
        picture=channel_data.picture,
    )

    db.add(channel)
    await db.commit()
    await db.refresh(channel)

    return _to_channel_read(channel, 0, "owner", user)


async def save_channel_picture(file: UploadFile) -> str:
    content = await file.read()

    if len(content) > MAX_CHANNEL_PICTURE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Channel picture is too large",
        )

    processed_content = process_channel_picture(content)

    CHANNEL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.jpg"
    file_path = CHANNEL_UPLOADS_DIR / filename
    file_path.write_bytes(processed_content)

    return f"{CHANNEL_UPLOADS_ROUTE}/{filename}"


async def update_user_channel(
    db: AsyncSession,
    user: User,
    channel_id: int,
    channel_data: ChannelUpdate,
) -> ChannelRead:
    await ensure_active_subscription(db=db, user=user)

    owner_id = user.telegram_id
    channel = await _get_owned_channel(db, user, channel_id)
    update_data = channel_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(channel, field, value)

    await db.commit()

    return await get_user_channel_by_owner(db, owner_id, channel_id)


async def delete_user_channel(db: AsyncSession, user: User, channel_id: int) -> None:
    await ensure_active_subscription(db=db, user=user)

    channel = await _get_owned_channel(db, user, channel_id)

    channel.is_active = False
    await db.commit()


async def _get_owned_channel(
    db: AsyncSession,
    user: User,
    channel_id: int,
) -> Channel:
    result = await db.execute(
        select(Channel).where(
            Channel.id == channel_id,
            Channel.owner_id == user.telegram_id,
        )
    )
    channel = result.scalar_one_or_none()

    if channel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    return channel


def _channels_with_placements_count() -> Select[tuple[Channel, int, User]]:
    return (
        select(Channel, func.count(Placement.id).label("placements_count"), User)
        .join(User, User.telegram_id == Channel.owner_id)
        .outerjoin(Placement, Placement.channel_id == Channel.id)
        .group_by(Channel.id, User.telegram_id)
        .order_by(Channel.created_at.desc())
    )


async def _owner_subscription_active_map(
    db: AsyncSession,
    owner_telegram_ids: list[int],
) -> dict[int, bool]:
    unique_owner_ids = list(dict.fromkeys(owner_telegram_ids))
    owner_subscription_active_by_id: dict[int, bool] = {}

    for owner_telegram_id in unique_owner_ids:
        owner_subscription_active_by_id[owner_telegram_id] = (
            await user_has_active_subscription(
                db=db,
                user_telegram_id=owner_telegram_id,
            )
        )

    return owner_subscription_active_by_id


def _to_channel_read(
    channel: Channel,
    placements_count: int,
    access_role: str,
    owner: User | None = None,
    *,
    owner_subscription_active: bool | None = None,
) -> ChannelRead:
    return ChannelRead(
        id=channel.id,
        owner_id=channel.owner_id,
        owner_username=owner.username if owner is not None else None,
        owner_first_name=owner.first_name if owner is not None else None,
        title=channel.title,
        link=channel.link,
        picture=channel.picture,
        is_active=channel.is_active,
        placements_count=placements_count,
        access_role=access_role,
        owner_subscription_active=owner_subscription_active,
        created_at=channel.created_at,
        updated_at=channel.updated_at,
    )
