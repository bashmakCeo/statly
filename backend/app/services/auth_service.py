from datetime import UTC, datetime

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.telegram.auth import TelegramUserData
from app.models.user import User
from app.services.channel_access import link_pending_channel_managers
from app.services.subscription_service import ensure_free_trial_for_new_user


async def upsert_user_from_telegram(
    db: AsyncSession,
    telegram_user: TelegramUserData,
    ip_address: str | None,
) -> User:
    login_at = datetime.now(UTC)
    user_values = {
        "telegram_id": telegram_user.telegram_id,
        "username": telegram_user.username,
        "first_name": telegram_user.first_name,
        "last_name": telegram_user.last_name,
        "language_code": telegram_user.language_code,
        "photo_url": telegram_user.photo_url,
        "is_premium": telegram_user.is_premium,
        "last_login_at": login_at,
        "ip_address": ip_address,
    }

    statement = (
        insert(User)
        .values(**user_values)
        .on_conflict_do_update(
            index_elements=[User.telegram_id],
            set_=user_values,
        )
        .returning(User.telegram_id)
    )
    result = await db.execute(statement)
    telegram_id = result.scalar_one()
    await db.commit()

    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one()
    await link_pending_channel_managers(db, user)
    await ensure_free_trial_for_new_user(db=db, user=user)
    return user
