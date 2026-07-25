from datetime import datetime

from pydantic import BaseModel, Field, IPvAnyAddress

from app.core.timezone import DEFAULT_TIMEZONE


class UserRead(BaseModel):
    telegram_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    language_code: str | None
    photo_url: str | None
    is_premium: bool
    timezone: str
    placement_reminders_enabled: bool
    last_login_at: datetime | None
    ip_address: IPvAnyAddress | None
    created_at: datetime
    updated_at: datetime


class UserTimezoneUpdate(BaseModel):
    timezone: str = Field(min_length=1, max_length=64)


class UserSettingsUpdate(BaseModel):
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    placement_reminders_enabled: bool | None = None


class TimezoneOptionRead(BaseModel):
    id: str
    label: str


class TimezoneOptionsResponse(BaseModel):
    default_timezone: str = DEFAULT_TIMEZONE
    options: list[TimezoneOptionRead]
