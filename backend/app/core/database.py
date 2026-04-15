# backend/app/core/database.py

import ssl
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


def _strip_ssl_param(url: str) -> str:
    """Remove ?ssl=... or &ssl=... from URL — supplied via connect_args instead."""
    import re
    # Remove ssl query param entirely; asyncpg ignores it in the URL anyway
    url = re.sub(r"[?&]ssl=[^&]*", "", url)
    # Clean up dangling ? or &
    url = re.sub(r"\?$", "", url)
    return url


# ── Async engine — FastAPI routes ──────────────────────────────────────────

_db_url = settings.DATABASE_URL
_async_connect_args: dict = {}

if _is_external_db(_db_url):
    # asyncpg requires an ssl.SSLContext (or True) via connect_args.
    # It does NOT reliably parse ?ssl=require from the DSN.
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE  # Render uses managed certs; allow flexible verification
    _async_connect_args = {"ssl": _ssl_ctx}

# Strip ?ssl= from URL to avoid asyncpg DSN parse errors
_async_url = _strip_ssl_param(_db_url)

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
        sync_url = _strip_ssl_param(_db_url).replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://"
        )
        sync_connect_args: dict = {}
        if _is_external_db(sync_url):
            sync_connect_args = {"sslmode": "require"}
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
    """Verify the database connection during application startup."""
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Database connection initialized")


async def close_db() -> None:
    """Dispose the async engine during shutdown."""
    await engine.dispose()
    logger.info("Database engine disposed")


async_session_factory = AsyncSessionLocal
