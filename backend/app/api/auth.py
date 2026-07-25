from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core.timezone import DEFAULT_TIMEZONE, SUPPORTED_TIMEZONES
from app.schemas.auth import TelegramAuthResponse
from app.schemas.user import (
    TimezoneOptionRead,
    TimezoneOptionsResponse,
    UserRead,
    UserSettingsUpdate,
    UserTimezoneUpdate,
)
from app.services.user_service import update_user_settings, update_user_timezone

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/telegram", response_model=TelegramAuthResponse)
async def auth_with_telegram(current_user: CurrentUser) -> TelegramAuthResponse:
    return TelegramAuthResponse(
        user=UserRead.model_validate(current_user, from_attributes=True),
    )


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user, from_attributes=True)


@router.get("/timezones", response_model=TimezoneOptionsResponse)
async def get_timezones() -> TimezoneOptionsResponse:
    return TimezoneOptionsResponse(
        default_timezone=DEFAULT_TIMEZONE,
        options=[
            TimezoneOptionRead(id=timezone_id, label=label)
            for timezone_id, label in SUPPORTED_TIMEZONES
        ],
    )


@router.patch("/me/timezone", response_model=UserRead)
async def update_my_timezone(
    payload: UserTimezoneUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> UserRead:
    updated_user = await update_user_timezone(
        db=db,
        user=current_user,
        timezone=payload.timezone,
    )
    return UserRead.model_validate(updated_user, from_attributes=True)


@router.patch("/me/settings", response_model=UserRead)
async def update_my_settings(
    payload: UserSettingsUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> UserRead:
    updated_user = await update_user_settings(
        db=db,
        user=current_user,
        timezone=payload.timezone,
        placement_reminders_enabled=payload.placement_reminders_enabled,
    )
    return UserRead.model_validate(updated_user, from_attributes=True)
