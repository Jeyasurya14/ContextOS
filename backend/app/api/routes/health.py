# backend/app/api/routes/health.py

from datetime import datetime
from fastapi import APIRouter, Response, status
from loguru import logger
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.database import check_database_health
from app.services.qdrant_service import check_qdrant_health

router = APIRouter(tags=["health"])


@router.get("/")
async def root() -> dict:
    """Root endpoint providing basic API information."""
    return {
        "name": "ContextOS API",
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.DEBUG else "disabled in production",
    }


@router.get("/health")
async def health_check(response: Response) -> dict:
    """Health check endpoint verifying all services."""
    db_ok = await check_database_health()
    
    redis_ok = False
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()
        redis_ok = True
    except Exception:
        pass
    
    qdrant_ok = await check_qdrant_health()
    
    all_ok = db_ok and redis_ok and qdrant_ok
    
    if not all_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return {
        "status": "ok" if all_ok else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {
            "postgres": "connected" if db_ok else "error",
            "redis": "connected" if redis_ok else "error",
            "qdrant": "connected" if qdrant_ok else "error",
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
async def readiness_check() -> dict:
    """Lightweight readiness check for Render."""
    return {"ready": True}


@router.get("/health/live")
async def liveness_check() -> dict:
    """Lightweight liveness check."""
    return {"alive": True}
