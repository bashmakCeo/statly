from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.models.placement import Placement
from app.models.user import User


async def get_admin_stats(*, db: AsyncSession) -> dict[str, int | Decimal]:
    users_count = await db.scalar(select(func.count()).select_from(User)) or 0
    channels_count = await db.scalar(select(func.count()).select_from(Channel)) or 0
    placements_count = await db.scalar(select(func.count()).select_from(Placement)) or 0
    placements_total_price = await db.scalar(
        select(func.coalesce(func.sum(Placement.price), 0))
    ) or Decimal("0")

    return {
        "users_count": int(users_count),
        "channels_count": int(channels_count),
        "placements_count": int(placements_count),
        "placements_total_price": placements_total_price,
    }


def format_admin_stats_message(stats: dict[str, int | Decimal]) -> str:
    total_price = stats["placements_total_price"]
    if isinstance(total_price, Decimal):
        price_label = _format_rub(total_price)
    else:
        price_label = _format_rub(Decimal(str(total_price)))

    return (
        "Statly — статистика\n\n"
        f"Пользователей: {stats['users_count']}\n"
        f"Каналов: {stats['channels_count']}\n"
        f"Размещений: {stats['placements_count']}\n"
        f"Сумма размещений: {price_label}"
    )


def _format_rub(amount: Decimal) -> str:
    quantized = amount.quantize(Decimal("0.01"))
    sign = "-" if quantized < 0 else ""
    absolute_value = abs(quantized)
    integer_part, _, fractional_part = f"{absolute_value:.2f}".partition(".")

    grouped_integer = f"{int(integer_part):,}".replace(",", " ")

    if fractional_part == "00":
        return f"{sign}{grouped_integer} ₽"

    return f"{sign}{grouped_integer},{fractional_part} ₽"
