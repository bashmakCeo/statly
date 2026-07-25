from pydantic import BaseModel

from app.schemas.user import UserRead


class TelegramAuthResponse(BaseModel):
    user: UserRead
