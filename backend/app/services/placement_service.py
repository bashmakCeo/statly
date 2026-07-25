from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.placement_datetime import (
    local_publish_to_storage,
    placement_local_date_expr,
    placement_storage_order_expr,
)
from app.core.timezone import resolve_timezone_name
from app.models.channel import Channel
from app.models.placement import Placement
from app.models.user import User
from app.schemas.placement import (
    PlacementAnalytics,
    PlacementAnalyticsBucket,
    PlacementCountByChannel,
    PlacementCountsByDate,
    PlacementCountsByDateRange,
    PlacementCreate,
    PlacementFormatSuggestions,
    PlacementRead,
    PlacementUpdate,
)
from app.services.channel_access import get_channel_access_role, user_can_access_channel_condition
from app.services.subscription_service import ensure_active_subscription_for_channel


async def create_user_placement(
    db: AsyncSession,
    user: User,
    placement_data: PlacementCreate,
) -> PlacementRead:
    await _ensure_user_can_access_channel(db, user, placement_data.channel_id)
    await ensure_active_subscription_for_channel(
        db=db,
        user=user,
        channel_id=placement_data.channel_id,
    )

    publish_date, publish_time = local_publish_to_storage(
        publish_date=placement_data.publish_date,
        publish_time=placement_data.publish_time,
        timezone_name=user.timezone,
    )

    placement = Placement(
        channel_id=placement_data.channel_id,
        seller_telegram_id=user.telegram_id,
        buyer_name=placement_data.buyer_name,
        buyer_contact=placement_data.buyer_contact,
        price=placement_data.price,
        format=placement_data.format,
        publish_date=publish_date,
        publish_time=publish_time,
        status=placement_data.status or "unpaid",
        comment=placement_data.comment,
    )

    db.add(placement)
    await db.commit()
    await db.refresh(placement)

    return _to_placement_read(placement, user)


async def get_user_placement(
    db: AsyncSession,
    user: User,
    placement_id: int,
) -> PlacementRead:
    placement = await _get_user_placement_model(db, user, placement_id)

    return _to_placement_read(placement, user)


async def update_user_placement(
    db: AsyncSession,
    user: User,
    placement_id: int,
    placement_data: PlacementUpdate,
) -> PlacementRead:
    placement = await _get_user_placement_model(db, user, placement_id)
    await ensure_active_subscription_for_channel(
        db=db,
        user=user,
        channel_id=placement.channel_id,
    )

    previous_publish_date = placement.publish_date
    previous_publish_time = placement.publish_time

    publish_date, publish_time = local_publish_to_storage(
        publish_date=placement_data.publish_date,
        publish_time=placement_data.publish_time,
        timezone_name=user.timezone,
    )

    placement.buyer_name = placement_data.buyer_name
    placement.buyer_contact = placement_data.buyer_contact
    placement.price = placement_data.price
    placement.format = placement_data.format
    placement.publish_date = publish_date
    placement.publish_time = publish_time
    placement.status = placement_data.status or "unpaid"
    placement.comment = placement_data.comment

    if (
        placement.publish_date != previous_publish_date
        or placement.publish_time != previous_publish_time
    ):
        placement.reminder_sent_at = None

    await db.commit()
    await db.refresh(placement)

    return _to_placement_read(placement, user)


async def delete_user_placement(
    db: AsyncSession,
    user: User,
    placement_id: int,
) -> None:
    placement = await _get_user_placement_model(db, user, placement_id)
    await ensure_active_subscription_for_channel(
        db=db,
        user=user,
        channel_id=placement.channel_id,
    )

    await db.delete(placement)
    await db.commit()


async def get_user_placements_by_channel_and_date(
    db: AsyncSession,
    user: User,
    channel_id: int,
    target_date: date,
) -> list[PlacementRead]:
    await _ensure_user_can_access_channel(db, user, channel_id)

    return await _list_user_placements(
        db,
        user,
        channel_id=channel_id,
        target_date=target_date,
    )


async def get_user_placement_counts_by_date_range(
    db: AsyncSession,
    user: User,
    start_date: date,
    end_date: date,
    channel_id: int | None = None,
) -> PlacementCountsByDateRange:
    result = await db.execute(
        _placement_counts_by_date_range_statement(
            user,
            start_date,
            end_date,
            channel_id=channel_id,
        )
    )

    counts_by_date: dict[date, list[PlacementCountByChannel]] = {}

    for placement_date, channel_id_value, placements_count in result.all():
        counts_by_date.setdefault(placement_date, []).append(
            PlacementCountByChannel(
                channel_id=channel_id_value,
                placements_count=placements_count,
            )
        )

    return PlacementCountsByDateRange(
        start_date=start_date,
        end_date=end_date,
        days=[
            PlacementCountsByDate(
                date=day,
                channels=counts_by_date.get(day, []),
            )
            for day in _date_range(start_date, end_date)
        ],
    )


async def get_user_placement_format_suggestions(
    db: AsyncSession,
    user: User,
    channel_ids: list[int],
    limit: int = 10,
) -> PlacementFormatSuggestions:
    result = await db.execute(
        _placement_format_suggestions_statement(user, channel_ids, limit)
    )

    return PlacementFormatSuggestions(formats=list(result.scalars().all()))


async def get_user_placements_by_channel_and_date_range(
    db: AsyncSession,
    user: User,
    channel_id: int,
    start_date: date,
    end_date: date,
) -> list[PlacementRead]:
    await _ensure_user_can_access_channel(db, user, channel_id)

    return await _list_user_placements(
        db,
        user,
        channel_id=channel_id,
        start_date=start_date,
        end_date=end_date,
    )


def _placement_analytics_date(by_purchase_date: bool, timezone_name: str):
    if by_purchase_date:
        return func.date(func.timezone(timezone_name, Placement.created_at))

    user_timezone = resolve_timezone_name(timezone_name)
    return placement_local_date_expr(user_timezone)


async def get_user_placement_analytics(
    db: AsyncSession,
    user: User,
    year: int,
    channel_ids: list[int] | None = None,
    paid_only: bool = False,
    by_purchase_date: bool = False,
) -> PlacementAnalytics:
    # Группируем размещения по каналу и месяцу для аналитики на странице "Аналитика".
    user_timezone = resolve_timezone_name(user.timezone)
    placement_date = _placement_analytics_date(by_purchase_date, user_timezone)
    placement_year = func.extract("year", placement_date)
    placement_month = func.extract("month", placement_date)

    statement = (
        select(
            Placement.channel_id,
            placement_month.label("placement_month"),
            func.coalesce(func.sum(Placement.price), 0).label("total_price"),
            func.count(Placement.id).label("placements_count"),
        )
        .join(Channel, Channel.id == Placement.channel_id)
        .where(
            user_can_access_channel_condition(user),
            Channel.is_active.is_(True),
            placement_year == year,
        )
        .group_by(Placement.channel_id, placement_month)
        .order_by(placement_month.asc(), Placement.channel_id.asc())
    )

    if channel_ids:
        statement = statement.where(Placement.channel_id.in_(channel_ids))

    if paid_only:
        statement = statement.where(Placement.status == "paid")

    result = await db.execute(statement)

    return PlacementAnalytics(
        year=year,
        buckets=[
            PlacementAnalyticsBucket(
                channel_id=channel_id,
                month=int(placement_month),
                total_price=total_price,
                placements_count=placements_count,
            )
            for channel_id, placement_month, total_price, placements_count in result.all()
        ],
    )


async def get_user_placement_analytics_years(
    db: AsyncSession,
    user: User,
    paid_only: bool = False,
    by_purchase_date: bool = False,
) -> list[int]:
    user_timezone = resolve_timezone_name(user.timezone)
    placement_date = _placement_analytics_date(by_purchase_date, user_timezone)
    placement_year = func.extract("year", placement_date)

    statement = (
        select(placement_year)
        .distinct()
        .join(Channel, Channel.id == Placement.channel_id)
        .where(
            user_can_access_channel_condition(user),
            Channel.is_active.is_(True),
        )
        .order_by(placement_year.desc())
    )

    if paid_only:
        statement = statement.where(Placement.status == "paid")

    result = await db.execute(statement)

    return [
        int(year_value)
        for year_value in result.scalars().all()
        if year_value is not None
    ]


async def get_user_placements_by_date_range(
    db: AsyncSession,
    user: User,
    start_date: date,
    end_date: date,
) -> list[PlacementRead]:
    return await _list_user_placements(
        db,
        user,
        start_date=start_date,
        end_date=end_date,
    )


async def _list_user_placements(
    db: AsyncSession,
    user: User,
    *,
    channel_id: int | None = None,
    target_date: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[PlacementRead]:
    user_timezone = resolve_timezone_name(user.timezone)
    local_publish_date = placement_local_date_expr(user_timezone)
    statement = _accessible_placements_statement(user)

    if channel_id is not None:
        statement = statement.where(Placement.channel_id == channel_id)

    if target_date is not None:
        statement = statement.where(local_publish_date == target_date)
    else:
        if start_date is not None:
            statement = statement.where(local_publish_date >= start_date)
        if end_date is not None:
            statement = statement.where(local_publish_date <= end_date)

    statement = statement.order_by(
        placement_storage_order_expr().asc(),
        Placement.id.asc(),
    )

    result = await db.execute(statement)

    return [_to_placement_read(placement, user) for placement in result.scalars().all()]


def _placement_format_suggestions_statement(
    user: User,
    channel_ids: list[int],
    limit: int,
) -> Select[tuple[str]]:
    statement = (
        select(Placement.format)
        .join(Channel, Channel.id == Placement.channel_id)
        .where(
            user_can_access_channel_condition(user),
            Placement.format != "",
        )
        .group_by(Placement.format)
        .order_by(func.count(Placement.id).desc(), Placement.format.asc())
        .limit(limit)
    )

    if channel_ids:
        statement = statement.where(Placement.channel_id.in_(channel_ids))

    return statement


def _placement_counts_by_date_range_statement(
    user: User,
    start_date: date,
    end_date: date,
    channel_id: int | None = None,
) -> Select[tuple[date, int, int]]:
    user_timezone = resolve_timezone_name(user.timezone)
    local_publish_date = placement_local_date_expr(user_timezone)

    statement = (
        select(
            local_publish_date.label("placement_date"),
            Placement.channel_id,
            func.count(Placement.id).label("placements_count"),
        )
        .join(Channel, Channel.id == Placement.channel_id)
        .where(
            user_can_access_channel_condition(user),
            local_publish_date >= start_date,
            local_publish_date <= end_date,
        )
        .group_by(local_publish_date, Placement.channel_id)
        .order_by(local_publish_date.asc())
    )

    if channel_id is not None:
        statement = statement.where(Placement.channel_id == channel_id)
    else:
        statement = statement.where(Channel.is_active.is_(True))

    return statement


def _date_range(start_date: date, end_date: date) -> list[date]:
    # Диапазон включительный: start_date и end_date оба попадают в ответ.
    days_count = (end_date - start_date).days + 1

    return [start_date + timedelta(days=day_index) for day_index in range(days_count)]


async def _get_user_placement_model(
    db: AsyncSession,
    user: User,
    placement_id: int,
) -> Placement:
    result = await db.execute(
        _accessible_placements_statement(user).where(Placement.id == placement_id)
    )
    placement = result.scalar_one_or_none()

    if placement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Placement not found",
        )

    return placement


def _accessible_placements_statement(user: User) -> Select[tuple[Placement]]:
    return (
        select(Placement)
        .join(Channel, Channel.id == Placement.channel_id)
        .where(
            user_can_access_channel_condition(user),
            Channel.is_active.is_(True),
        )
    )


async def _ensure_user_can_access_channel(
    db: AsyncSession,
    user: User,
    channel_id: int,
) -> None:
    access_role = await get_channel_access_role(db, user, channel_id)

    if access_role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    active_result = await db.execute(
        select(Channel.id).where(
            Channel.id == channel_id,
            Channel.is_active.is_(True),
        )
    )

    if active_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )


def _to_placement_read(placement: Placement, user: User) -> PlacementRead:
    return PlacementRead(
        id=placement.id,
        channel_id=placement.channel_id,
        seller_telegram_id=placement.seller_telegram_id,
        buyer_name=placement.buyer_name,
        buyer_contact=placement.buyer_contact,
        price=placement.price,
        format=placement.format,
        publish_date=placement.publish_date,
        publish_time=placement.publish_time,
        status=placement.status,
        comment=placement.comment,
        created_at=placement.created_at,
        updated_at=placement.updated_at,
    )
