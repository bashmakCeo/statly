from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.subscription import (
    CreateSubscriptionInvoiceRequest,
    MySubscriptionRead,
    SubscriptionInvoiceRead,
    SubscriptionPlanRead,
)
from app.services.subscription_service import (
    claim_channel_bonus,
    create_subscription_invoice,
    get_my_subscription,
    get_subscription_plan,
)

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


@router.get("", response_model=SubscriptionPlanRead)
async def get_subscription(_current_user: CurrentUser) -> SubscriptionPlanRead:
    return get_subscription_plan()


@router.get("/me", response_model=MySubscriptionRead)
async def get_my_subscription_state(
    db: DbSession,
    current_user: CurrentUser,
) -> MySubscriptionRead:
    return await get_my_subscription(db=db, user=current_user)


@router.post("/channel-bonus/claim", response_model=MySubscriptionRead)
async def claim_channel_bonus_reward(
    db: DbSession,
    current_user: CurrentUser,
) -> MySubscriptionRead:
    return await claim_channel_bonus(db=db, user=current_user)


@router.post("/invoices", response_model=SubscriptionInvoiceRead)
async def create_invoice(
    payload: CreateSubscriptionInvoiceRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> SubscriptionInvoiceRead:
    return await create_subscription_invoice(db=db, user=current_user, payload=payload)
