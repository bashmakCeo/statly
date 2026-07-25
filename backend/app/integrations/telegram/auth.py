import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

from fastapi import HTTPException, status

MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60
MAX_AUTH_DATE_FUTURE_SKEW_SECONDS = 5 * 60


@dataclass(frozen=True)
class TelegramUserData:
    telegram_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    language_code: str | None
    photo_url: str | None
    is_premium: bool


def parse_init_data(init_data: str) -> TelegramUserData:
    params = dict(parse_qsl(init_data, keep_blank_values=True))
    raw_user = params.get("user")

    if raw_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram user data is missing",
        )

    user_data = json.loads(raw_user)

    return TelegramUserData(
        telegram_id=user_data["id"],
        username=user_data.get("username"),
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        language_code=user_data.get("language_code"),
        photo_url=user_data.get("photo_url"),
        is_premium=user_data.get("is_premium", False),
    )


def validate_init_data(
    init_data: str,
    bot_token: str | None,
    allow_insecure: bool,
) -> TelegramUserData:
    if allow_insecure:
        return parse_init_data(init_data)

    if bot_token is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram bot token is not configured",
        )

    if not is_valid_init_data(init_data, bot_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram init data",
        )

    validate_auth_date(init_data)

    return parse_init_data(init_data)


def is_valid_init_data(init_data: str, bot_token: str) -> bool:
    params = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = params.pop("hash", None)

    if received_hash is None:
        return False

    # Telegram требует проверять HMAC по отсортированной строке key=value.
    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(params.items())
    )
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=bot_token.encode(),
        digestmod=hashlib.sha256,
    ).digest()
    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(calculated_hash, received_hash)


def validate_auth_date(init_data: str) -> None:
    params = dict(parse_qsl(init_data, keep_blank_values=True))
    raw_auth_date = params.get("auth_date")

    if raw_auth_date is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram auth_date is missing",
        )

    try:
        auth_date = int(raw_auth_date)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram auth_date",
        ) from error

    now = int(time.time())
    if auth_date - now > MAX_AUTH_DATE_FUTURE_SKEW_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram auth_date is in the future",
        )

    if now - auth_date > MAX_INIT_DATA_AGE_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram init data is expired",
        )
