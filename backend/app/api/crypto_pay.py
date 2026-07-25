import hashlib
import hmac
import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.subscription_service import activate_crypto_subscription_from_payment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crypto-pay", tags=["crypto-pay"])


@router.post("/webhook")
async def handle_crypto_pay_webhook(request: Request) -> dict[str, bool]:
    raw_body = await request.body()
    _verify_crypto_pay_signature(
        raw_body=raw_body,
        signature=request.headers.get("crypto-pay-api-signature"),
    )

    try:
        update = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Crypto Pay webhook JSON",
        ) from error

    if not isinstance(update, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Crypto Pay webhook payload",
        )

    if update.get("update_type") != "invoice_paid":
        return {"ok": True}

    invoice = update.get("payload")
    if not isinstance(invoice, dict) or not _is_paid_invoice(invoice):
        return {"ok": True}

    invoice_payload = invoice.get("payload")
    if not isinstance(invoice_payload, str) or not invoice_payload:
        return {"ok": True}

    logger.info("crypto_pay_webhook event=invoice_paid")
    async with SessionLocal() as db:
        await activate_crypto_subscription_from_payment(db=db, payload=invoice_payload)

    return {"ok": True}


def _verify_crypto_pay_signature(
    *,
    raw_body: bytes,
    signature: str | None,
) -> None:
    if not settings.crypto_pay_api_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Crypto Pay token is not configured",
        )

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Crypto Pay signature is missing",
        )

    secret = hashlib.sha256(settings.crypto_pay_api_token.encode()).digest()
    expected_signature = hmac.new(
        secret,
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Crypto Pay signature",
        )


def _is_paid_invoice(invoice: dict[str, Any]) -> bool:
    status_value = invoice.get("status")
    if isinstance(status_value, str):
        return status_value == "paid"

    return True
