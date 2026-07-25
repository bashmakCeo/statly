from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import validate_timezone_name
from app.models.user import User


async def update_user_timezone(
    db: AsyncSession,
    user: User,
    timezone: str,
) -> User:
    return await update_user_settings(
        db=db,
        user=user,
        timezone=timezone,
    )


async def update_user_settings(
    db: AsyncSession,
    user: User,
    timezone: str | None = None,
    placement_reminders_enabled: bool | None = None,
) -> User:
    if timezone is not None:
        try:
            user.timezone = validate_timezone_name(timezone)
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(error),
            ) from error

    if placement_reminders_enabled is not None:
        user.placement_reminders_enabled = placement_reminders_enabled

    await db.commit()
    await db.refresh(user)

    return user
