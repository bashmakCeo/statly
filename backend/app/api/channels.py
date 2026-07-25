from fastapi import APIRouter, File, Response, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.channel import (
    ChannelCreate,
    ChannelPictureUploadResponse,
    ChannelRead,
    ChannelUpdate,
)
from app.services.channel_service import (
    create_user_channel,
    delete_user_channel,
    get_user_channel,
    list_user_channels,
    save_channel_picture,
    update_user_channel,
)
from app.services.subscription_service import ensure_active_subscription

router = APIRouter(prefix="/api/channels", tags=["channels"])


@router.get("", response_model=list[ChannelRead])
async def get_channels(db: DbSession, current_user: CurrentUser) -> list[ChannelRead]:
    return await list_user_channels(db, current_user)


@router.post("", response_model=ChannelRead, status_code=status.HTTP_201_CREATED)
async def create_channel(
    payload: ChannelCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> ChannelRead:
    return await create_user_channel(db, current_user, payload)


@router.post("/picture", response_model=ChannelPictureUploadResponse)
async def upload_channel_picture(
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> ChannelPictureUploadResponse:
    await ensure_active_subscription(db=db, user=current_user)
    picture = await save_channel_picture(file)

    return ChannelPictureUploadResponse(picture=picture)


@router.get("/{channel_id}", response_model=ChannelRead)
async def get_channel(
    channel_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ChannelRead:
    return await get_user_channel(db, current_user, channel_id)


@router.patch("/{channel_id}", response_model=ChannelRead)
async def update_channel(
    channel_id: int,
    payload: ChannelUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ChannelRead:
    return await update_user_channel(db, current_user, channel_id, payload)


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    await delete_user_channel(db, current_user, channel_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
