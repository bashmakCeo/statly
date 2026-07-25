from pydantic import BaseModel


class ChannelManagerCreate(BaseModel):
    username: str


class ChannelManagerRead(BaseModel):
    id: int
    channel_id: int
    username: str
    first_name: str | None = None
    photo_url: str | None = None
