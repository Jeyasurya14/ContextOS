"""Analytics API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User
from app.services import analytics_service

router = APIRouter(tags=["analytics"])


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get overview statistics."""
    stats = await analytics_service.get_overview_stats(db, user)
    return stats


@router.get("/conversations")
async def get_conversation_analytics(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get conversation analytics."""
    analytics = await analytics_service.get_conversation_analytics(db, user, days)
    return analytics


@router.get("/integrations")
async def get_integration_analytics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get integration usage analytics."""
    analytics = await analytics_service.get_integration_analytics(db, user)
    return analytics


@router.get("/prompts")
async def get_prompt_analytics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get prompt usage analytics."""
    analytics = await analytics_service.get_prompt_analytics(db, user)
    return analytics


@router.get("/activity")
async def get_activity_timeline(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get recent activity timeline."""
    activities = await analytics_service.get_activity_timeline(db, user, days)
    return {"activities": activities, "period_days": days}
