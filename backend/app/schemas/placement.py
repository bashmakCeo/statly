from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

PlacementStatus = Literal["paid", "unpaid"]


class PlacementCreate(BaseModel):
    channel_id: int
    buyer_name: str
    buyer_contact: str | None = None
    price: Decimal
    format: str
    publish_date: date
    publish_time: time | None = None
    status: PlacementStatus | None = None
    comment: str | None = None


class PlacementUpdate(BaseModel):
    buyer_name: str
    buyer_contact: str | None = None
    price: Decimal
    format: str
    publish_date: date
    publish_time: time | None = None
    status: PlacementStatus | None = None
    comment: str | None = None


class PlacementRead(BaseModel):
    id: int
    channel_id: int
    seller_telegram_id: int
    buyer_name: str
    buyer_contact: str | None
    price: Decimal
    format: str
    publish_date: date
    publish_time: time | None
    status: PlacementStatus
    comment: str | None
    created_at: datetime
    updated_at: datetime


class PlacementCountByChannel(BaseModel):
    channel_id: int
    placements_count: int


class PlacementCountsByDate(BaseModel):
    date: date
    channels: list[PlacementCountByChannel]


class PlacementCountsByDateRange(BaseModel):
    start_date: date
    end_date: date
    days: list[PlacementCountsByDate]


class PlacementFormatSuggestions(BaseModel):
    formats: list[str]


class PlacementAnalyticsBucket(BaseModel):
    channel_id: int
    month: int
    total_price: Decimal
    placements_count: int


class PlacementAnalytics(BaseModel):
    year: int
    buckets: list[PlacementAnalyticsBucket]


class PlacementAnalyticsYears(BaseModel):
    years: list[int]
