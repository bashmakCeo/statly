from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.integrations.telegram.auth import validate_init_data
from app.models.user import User
from app.services.auth_service import upsert_user_from_telegram

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    request: Request,
    db: DbSession,
    telegram_init_data: Annotated[str | None, Header(alias="X-Telegram-Init-Data")] = None,
) -> User:
    if not telegram_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram init data is missing",
        )

    telegram_user = validate_init_data(
        init_data=telegram_init_data,
        bot_token=settings.telegram_bot_token,
        allow_insecure=settings.allow_insecure_init_data,
    )

    return await upsert_user_from_telegram(
        db=db,
        telegram_user=telegram_user,
        ip_address=request.client.host if request.client else None,
    )


CurrentUser = Annotated[User, Depends(get_current_user)]
