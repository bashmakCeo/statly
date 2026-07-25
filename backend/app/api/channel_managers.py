from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.channel_manager import ChannelManagerCreate, ChannelManagerRead
from app.services.channel_manager_service import (
    add_channel_manager,
    leave_channel_as_manager,
    list_channel_managers,
    remove_channel_manager,
)

router = APIRouter(prefix="/api/channels", tags=["channel-managers"])


@router.get("/{channel_id}/managers", response_model=list[ChannelManagerRead])
async def get_channel_managers(
    channel_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[ChannelManagerRead]:
    return await list_channel_managers(db, current_user, channel_id)


@router.post(
    "/{channel_id}/managers",
    response_model=ChannelManagerRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_channel_manager(
    channel_id: int,
    payload: ChannelManagerCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> ChannelManagerRead:
    return await add_channel_manager(db, current_user, channel_id, payload)


@router.delete("/{channel_id}/managers/me", status_code=status.HTTP_204_NO_CONTENT)
async def leave_managed_channel(
    channel_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    await leave_channel_as_manager(db, current_user, channel_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{channel_id}/managers/{manager_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel_manager(
    channel_id: int,
    manager_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    await remove_channel_manager(db, current_user, channel_id, manager_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
