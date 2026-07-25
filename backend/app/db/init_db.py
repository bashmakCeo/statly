from app.db.base import Base
from app.db.session import engine
from app.models.channel import Channel
from app.models.channel_manager import ChannelManager
from app.models.placement import Placement
from app.models.subscription import Subscription
from app.models.subscription_payment import SubscriptionPayment
from app.models.user import User


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


__all__ = [
    "Channel",
    "ChannelManager",
    "Placement",
    "Subscription",
    "SubscriptionPayment",
    "User",
    "init_db",
]
