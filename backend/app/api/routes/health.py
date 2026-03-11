# backend/app/api/routes/health.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger

from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """Health check endpoint verifying API and database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        logger.error("Database health check failed: {}", type(e).__name__)
        db_status = "error"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
    }
