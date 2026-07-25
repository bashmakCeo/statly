import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format="%(levelname)s %(name)s %(message)s",
)

import asyncio
import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from urllib.parse import parse_qsl

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.channel_managers import router as channel_managers_router
from app.api.channels import router as channels_router
from app.api.crypto_pay import router as crypto_pay_router
from app.api.ping import router as ping_router
from app.api.placements import router as placements_router
from app.api.subscription import router as subscription_router
from app.core.config import settings
from app.db.init_db import init_db
from app.jobs.scheduler import start_scheduler, stop_scheduler
from app.services.telegram_bot_service import run_telegram_long_polling

logger = logging.getLogger(__name__)

UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_ROUTE = "/uploads"
UPLOADS_ROUTE_NAME = "uploads"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    logger.info("application_start database_initialization_started")
    try:
        await init_db()
    except Exception:
        logger.exception("application_start database_initialization_failed")
        raise

    logger.info("application_start database_ready")
    telegram_polling_task = asyncio.create_task(run_telegram_long_polling())
    start_scheduler()
    logger.info("application_started")

    try:
        yield
    finally:
        logger.info("application_stop started")
        stop_scheduler()
        telegram_polling_task.cancel()
        with suppress(asyncio.CancelledError):
            await asyncio.wait_for(telegram_polling_task, timeout=10)
        logger.info("application_stopped")


app = FastAPI(title=settings.app_title, lifespan=lifespan)


@app.middleware("http")
async def log_user_action(request: Request, call_next):
    user_id = _get_telegram_user_id(request.headers.get("X-Telegram-Init-Data"))
    payload = request.url.path[:80]
    logger.info(
        "user_action user_id=%s action=%s payload=%r",
        user_id,
        request.method,
        payload,
    )

    try:
        return await call_next(request)
    except Exception:
        logger.exception(
            "user_action_failed user_id=%s action=%s payload=%r",
            user_id,
            request.method,
            payload,
        )
        raise


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_origin_regex=settings.cors_allowed_origin_regex,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allowed_methods,
    allow_headers=settings.cors_allowed_headers,
)

app.mount(
    UPLOADS_ROUTE,
    StaticFiles(directory=UPLOADS_DIR),
    name=UPLOADS_ROUTE_NAME,
)

app.include_router(auth_router)
app.include_router(channels_router)
app.include_router(channel_managers_router)
app.include_router(crypto_pay_router)
app.include_router(placements_router)
app.include_router(subscription_router)
app.include_router(ping_router)


def _get_telegram_user_id(init_data: str | None) -> int | None:
    if not init_data:
        return None

    try:
        raw_user = next(
            value
            for key, value in parse_qsl(init_data, keep_blank_values=True)
            if key == "user"
        )
        return int(json.loads(raw_user)["id"])
    except (KeyError, StopIteration, TypeError, ValueError, json.JSONDecodeError):
        return None
