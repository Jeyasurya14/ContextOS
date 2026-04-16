# backend/app/core/database.py

import re
from sqlalchemy.ext.asyncio import (
    create_async_engine, async_sessionmaker, AsyncSession
)
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine, text
from typing import AsyncGenerator
from loguru import logger

from app.core.config import settings

Base = declarative_base()
import app.models  # noqa: E402,F401 - register model metadata after Base exists


# ── Helpers ────────────────────────────────────────────────────────────────

def _strip_ssl_params(url: str) -> str:
    """Remove SSL/connection params that asyncpg does not accept in the DSN.
    SSL is configured via connect_args instead.
    - ssl / sslmode  — asyncpg uses connect_args={"ssl": "require"}
    - channel_binding — not supported by asyncpg or psycopg2; NeonDB
      sometimes appends this to its pooler URLs.
    Removing them prevents DSN parse errors."""
    url = re.sub(r"[?&]ssl=[^&]*", "", url)
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    url = re.sub(r"[?&]channel_binding=[^&]*", "", url)  # NeonDB pooler param
    url = re.sub(r"\?$", "", url)    # dangling ?
    url = re.sub(r"\?&", "?", url)  # ?&foo → ?foo
    return url


def _needs_ssl(url: str) -> bool:
    """Return True for external managed PostgreSQL hosts.
    Render internal hostnames are just 'dpg-xxx' with no domain — they never need SSL."""
    external = (
        ".render.com", ".onrender.com", "amazonaws.com",
        "supabase.co", "supabase.com", "neon.tech", "cockroachlabs.cloud",
    )
    return any(m in url for m in external)


# ── Async engine ────────────────────────────────────────────────────────────
# IMPORTANT: engine creation is wrapped in try/except so this module always
# imports cleanly even if DATABASE_URL is missing or malformed.
# Without this guard, any bad URL crashes the import → gunicorn can't load
# the FastAPI app → all requests return bare 500s from gunicorn itself
# (no middleware runs, no CORS headers) → browser sees "CORS blocked + 500".

_db_url = settings.DATABASE_URL
_async_url = _strip_ssl_params(_db_url) if _db_url else ""

_async_connect_args: dict = {"ssl": "require"} if _needs_ssl(_async_url) else {}

_POOL_SIZE = min(settings.DATABASE_POOL_SIZE, 5)
_MAX_OVERFLOW = min(settings.DATABASE_MAX_OVERFLOW, 5)

try:
    if not _async_url:
        raise ValueError("DATABASE_URL is not set. Set it in Render's Environment dashboard.")
    engine = create_async_engine(
        _async_url,
        pool_size=_POOL_SIZE,
        max_overflow=_MAX_OVERFLOW,
        pool_timeout=settings.DATABASE_POOL_TIMEOUT,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_reset_on_return="rollback",
        echo=settings.DEBUG,
        pool_use_lifo=True,
        connect_args=_async_connect_args,
    )
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    logger.info("Database engine created (URL: {}...)", _async_url[:40])
except Exception as _engine_init_error:
    logger.error(
        "FATAL: Could not create database engine: {}. "
        "App will start in degraded mode — all DB calls will fail.",
        _engine_init_error,
    )
    engine = None  # type: ignore[assignment]
    AsyncSessionLocal = None  # type: ignore[assignment]

# ── Sync engine — Celery workers ONLY ─────────────────────────────────────
# Use lazy initialisation — only create when first called (psycopg2 import safety).

_sync_engine = None
_sync_session_factory = None


def _get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        sync_url = _strip_ssl_params(_db_url).replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://"
        )
        sync_connect_args: dict = {"sslmode": "require"} if _needs_ssl(sync_url) else {}
        _sync_engine = create_engine(
            sync_url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=1800,
            connect_args=sync_connect_args,
        )
    return _sync_engine


def _get_sync_session_factory():
    global _sync_session_factory
    if _sync_session_factory is None:
        _sync_session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=_get_sync_engine(),
        )
    return _sync_session_factory


def get_sync_db():
    """Synchronous DB session for Celery workers. Use in try/finally."""
    return _get_sync_session_factory()()


# ── FastAPI dependency ─────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if AsyncSessionLocal is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not configured. Set DATABASE_URL on Render.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Health check ───────────────────────────────────────────────────────────
async def check_database_health() -> bool:
    if AsyncSessionLocal is None:
        logger.error("Database health check: engine not initialized")
        return False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error("Database health check failed: {}", e)
        return False


async def init_db() -> None:
    """Verify DB reachability on startup with exponential-backoff retries.
    Logs a warning (does not raise) if all attempts fail so the process
    stays alive and the health endpoint can still respond."""
    if engine is None:
        logger.error(
            "init_db: engine is None — DATABASE_URL was not set or was invalid. "
            "Set DATABASE_URL in Render's Environment dashboard and redeploy."
        )
        return
    import asyncio
    last_exc: Exception | None = None
    for attempt in range(1, 6):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database connection verified (attempt {})", attempt)
            return
        except Exception as exc:
            last_exc = exc
            wait = min(2 ** attempt, 16)
            logger.warning(
                "DB connect attempt {}/5 failed: {} — retrying in {}s",
                attempt, exc, wait,
            )
            await asyncio.sleep(wait)

    logger.error(
        "Database UNREACHABLE after 5 attempts: {}. "
        "Verify DATABASE_URL and network. Running in degraded mode.",
        last_exc,
    )


async def close_db() -> None:
    """Dispose the async engine on shutdown."""
    if engine is not None:
        await engine.dispose()
        logger.info("Database engine disposed")


async_session_factory = AsyncSessionLocal
