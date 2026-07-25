from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = "Europe/Moscow"

SUPPORTED_TIMEZONES: list[tuple[str, str]] = [
    ("Europe/Kaliningrad", "Калининград (UTC+2)"),
    ("Europe/Moscow", "Москва (UTC+3)"),
    ("Europe/Samara", "Самара (UTC+4)"),
    ("Asia/Yekaterinburg", "Екатеринбург (UTC+5)"),
    ("Asia/Omsk", "Омск (UTC+6)"),
    ("Asia/Krasnoyarsk", "Красноярск (UTC+7)"),
    ("Asia/Irkutsk", "Иркутск (UTC+8)"),
    ("Asia/Yakutsk", "Якутск (UTC+9)"),
    ("Asia/Vladivostok", "Владивосток (UTC+10)"),
    ("Asia/Magadan", "Магадан (UTC+11)"),
    ("Asia/Kamchatka", "Камчатка (UTC+12)"),
    ("Asia/Almaty", "Алматы (UTC+5)"),
    ("Asia/Tashkent", "Ташкент (UTC+5)"),
    ("Asia/Tbilisi", "Тбилиси (UTC+4)"),
    ("Asia/Baku", "Баку (UTC+4)"),
    ("Asia/Yerevan", "Ереван (UTC+4)"),
    ("Europe/Minsk", "Минск (UTC+3)"),
    ("Europe/Kyiv", "Киев (UTC+2)"),
]


def resolve_timezone_name(timezone_name: str | None) -> str:
    if timezone_name is None or timezone_name.strip() == "":
        return DEFAULT_TIMEZONE

    return timezone_name.strip()


def get_zoneinfo(timezone_name: str | None) -> ZoneInfo:
    resolved_name = resolve_timezone_name(timezone_name)

    try:
        return ZoneInfo(resolved_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)


def validate_timezone_name(timezone_name: str) -> str:
    resolved_name = resolve_timezone_name(timezone_name)
    allowed = {timezone_id for timezone_id, _ in SUPPORTED_TIMEZONES}

    if resolved_name not in allowed:
        raise ValueError(f"Unsupported timezone: {resolved_name}")

    return resolved_name
