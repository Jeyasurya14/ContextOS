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

def _is_external_db(url: str) -> bool:
    """Detect external managed PostgreSQL hosts that mandate SSL."""
    external = (
        ".render.com", ".onrender.com", "amazonaws.com",
        "supabase.co", "supabase.com", "neon.tech", "cockroachlabs.cloud",
    )
    return any(m in url for m in external)


def _strip_ssl_params(url: str) -> str:
    """Remove ?ssl=... &ssl=... &sslmode=... from the URL.
    asyncpg does not reliably parse these from the DSN string when used
    through SQLAlchemy; pass SSL via connect_args instead."""
    url = re.sub(r"[?&]ssl=[^&]*", "", url)
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    url = re.sub(r"\?$", "", url)      # dangling ?
    url = re.sub(r"\?&", "?", url)    # ?&foo → ?foo
    return url


# ── Async engine — FastAPI routes ──────────────────────────────────────────

_db_url = settings.DATABASE_URL
_async_url = _strip_ssl_params(_db_url)
_is_external = _is_external_db(_db_url)

# asyncpg accepts the string literals "require", "disable", "prefer" etc.
# directly as the `ssl` parameter in connect(). This is the most compatible
# approach for Render-hosted PostgreSQL — no SSLContext construction needed.
_async_connect_args: dict = {"ssl": "require"} if _is_external else {}

engine = create_async_engine(
    _async_url,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,    # Detect stale connections
    pool_recycle=1800,     # Recycle connections every 30 minutes
    echo=settings.DEBUG,
    pool_use_lifo=True,    # Use LIFO to reduce connection acquisition time
    connect_args=_async_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ── Sync engine — Celery workers ONLY ─────────────────────────────────────
# CRITICAL: Do NOT create sync_engine at module level.
# psycopg2 crashes on Python 3.14 if imported at module level.
# Use lazy initialization — only create when first called.

_sync_engine = None
_sync_session_factory = None


def _get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        sync_url = _strip_ssl_params(_db_url).replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://"
        )
        sync_connect_args: dict = {"sslmode": "require"} if _is_external else {}
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
    """
    Get a synchronous DB session for use in Celery workers.
    Always use in try/finally:
        db = get_sync_db()
        try:
            # do work
            db.commit()
        finally:
            db.close()
    """
    factory = _get_sync_session_factory()
    return factory()


# ── FastAPI dependency ─────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
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
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


async def init_db() -> None:
    """Verify the database connection during application startup.

    This uses retry logic so transient network blips during cold-start
    do not crash the entire application."""
    import asyncio
    last_exc: Exception | None = None
    for attempt in range(1, 6):  # 5 attempts
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database connection initialized (attempt {})", attempt)
            return
        except Exception as exc:
            last_exc = exc
            wait = min(2 ** attempt, 16)  # 2s, 4s, 8s, 16s, 16s
            logger.warning(
                "Database connection attempt {}/{} failed: {} — retrying in {}s",
                attempt, 5, exc, wait,
            )
            await asyncio.sleep(wait)

    # All retries exhausted — log and continue. The health endpoint will
    # reveal the unhealthy state; do NOT raise (would crash the process).
    logger.error(
        "Database connection FAILED after 5 attempts: {}. "
        "Running in degraded mode — check DATABASE_URL and network.",
        last_exc,
    )


async def close_db() -> None:
    """Dispose the async engine during shutdown."""
    await engine.dispose()
    logger.info("Database engine disposed")


async_session_factory = AsyncSessionLocal
