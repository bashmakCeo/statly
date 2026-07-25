from datetime import UTC, date, datetime, time

from sqlalchemy import DateTime, case, cast, func

from app.core.timezone import get_zoneinfo
from app.models.placement import Placement


def local_publish_to_storage(
    *,
    publish_date: date,
    publish_time: time | None,
    timezone_name: str | None,
) -> tuple[date, time | None]:
    """Локальные дата/время пользователя → UTC-дата и UTC-время для хранения."""
    if publish_time is None:
        return publish_date, None

    timezone = get_zoneinfo(timezone_name)
    local_dt = datetime.combine(publish_date, publish_time, tzinfo=timezone)
    utc_dt = local_dt.astimezone(UTC)
    return utc_dt.date(), utc_dt.time().replace(microsecond=0)


def storage_publish_to_local(
    *,
    publish_date: date,
    publish_time: time | None,
    timezone_name: str | None,
) -> tuple[date, time | None]:
    """UTC-дата и UTC-время из БД → локальные дата/время для API."""
    if publish_time is None:
        return publish_date, None

    utc_dt = datetime.combine(publish_date, publish_time, tzinfo=UTC)
    local_dt = utc_dt.astimezone(get_zoneinfo(timezone_name))
    return local_dt.date(), local_dt.time().replace(microsecond=0)


def storage_publish_utc_datetime(*, publish_date: date, publish_time: time) -> datetime:
    return datetime.combine(publish_date, publish_time, tzinfo=UTC)


def placement_local_date_expr(user_timezone: str):
    """Календарная дата размещения в часовом поясе пользователя."""
    utc_moment = func.timezone("UTC", Placement.publish_date + Placement.publish_time)

    return case(
        (Placement.publish_time.is_(None), Placement.publish_date),
        else_=func.date(func.timezone(user_timezone, utc_moment)),
    )


def placement_storage_order_expr():
    """Сортировка по UTC-моменту; без времени — полночь UTC."""
    return cast(
        Placement.publish_date + func.coalesce(Placement.publish_time, time.min),
        DateTime,
    )
