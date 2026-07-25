from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ChannelAccessRole = Literal["owner", "manager"]


class ChannelCreate(BaseModel):
    title: str
    link: str
    picture: str | None = None


class ChannelUpdate(BaseModel):
    title: str | None = None
    link: str | None = None
    picture: str | None = None
    is_active: bool | None = None


class ChannelRead(BaseModel):
    id: int
    owner_id: int
    owner_username: str | None = None
    owner_first_name: str | None = None
    title: str
    link: str
    picture: str | None
    is_active: bool
    placements_count: int
    access_role: ChannelAccessRole
    owner_subscription_active: bool | None = None
    created_at: datetime
    updated_at: datetime


class ChannelPictureUploadResponse(BaseModel):
    picture: str
