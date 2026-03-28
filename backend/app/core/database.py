# backend/app/core/database.py

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

# ── Async engine — FastAPI routes ──────────────────────────────
# Production-optimized connection pool settings
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,  # Detect stale connections
    pool_recycle=1800,   # Recycle connections every 30 minutes
    echo=settings.DEBUG,
    # Performance optimizations
    max_overflow=-1,  # Allow unlimited overflow in burst scenarios (cloud environments)
    pool_use_lifo=True,  # Use LIFO to reduce connection acquisition time
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ── Sync engine — Celery workers ONLY ─────────────────────────
# CRITICAL: Do NOT create sync_engine at module level.
# psycopg2 crashes on Python 3.14 if imported at module level.
# Use lazy initialization — only create when first called.

_sync_engine = None
_sync_session_factory = None

def _get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        SYNC_URL = settings.DATABASE_URL.replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://"
        )
        _sync_engine = create_engine(
            SYNC_URL,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=1800,
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

# ── FastAPI dependency ─────────────────────────────────────────
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

# ── Health check ───────────────────────────────────────────────
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
