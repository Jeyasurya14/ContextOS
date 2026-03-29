# backend/app/api/routes/health.py

import time
from datetime import datetime
from fastapi import APIRouter, Response, status
from loguru import logger
import redis.asyncio as aioredis
import psutil
import os

from app.core.config import settings
from app.core.database import check_database_health, engine
from app.services.qdrant_service import check_qdrant_health, qdrant_client
from app.core.monitoring import metrics

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
    """Comprehensive health check endpoint verifying all services."""
    db_ok = await check_database_health()

    redis_ok = False
    redis_info = {}
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        # Get Redis stats
        info = await redis_client.info()
        redis_info = {
            "connected_clients": info.get("connected_clients", 0),
            "used_memory_human": info.get("used_memory_human", "N/A"),
            "total_connections_received": info.get("total_connections_received", 0),
        }
        await redis_client.close()
        redis_ok = True
    except Exception as e:
        logger.warning("Redis health check failed: {}", e)

    qdrant_ok = await check_qdrant_health()
    qdrant_info = {}
    try:
        if qdrant_client:
            collection_info = qdrant_client.get_collection(settings.QDRANT_COLLECTION)
            qdrant_info = {
                "points_count": collection_info.vectors_count,
                "status": str(collection_info.status),
            }
    except Exception:
        pass

    # System metrics
    system_info = {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent
        if os.name != "nt"
        else psutil.disk_usage("C:").percent,
    }

    all_ok = db_ok and redis_ok and qdrant_ok
    status_code = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    response.status_code = status_code

    return {
        "status": "ok" if all_ok else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {
            "postgres": {"status": "connected" if db_ok else "error"},
            "redis": {"status": "connected" if redis_ok else "error", **redis_info},
            "qdrant": {"status": "connected" if qdrant_ok else "error", **qdrant_info},
        },
        "system": system_info,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
async def readiness_check() -> dict:
    """Lightweight readiness check for Kubernetes/Render."""
    from sqlalchemy import text

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {"ready": False, "error": str(e)}


@router.get("/health/live")
async def liveness_check() -> dict:
    """Lightweight liveness check."""
    return {
        "alive": True,
        "uptime": time.time() - metrics._start_time if "metrics" in globals() else 0,
    }


@router.get("/metrics")
async def get_metrics() -> dict:
    """Return application metrics ( Prometheus format could be added)."""
    stats = metrics.get_stats()
    return {
        "metrics": stats,
        "timestamp": datetime.utcnow().isoformat(),
    }
