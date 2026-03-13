# backend/app/api/routes/admin.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.models.user import User
from app.models.team import Team
from app.models.integration import Integration
from app.models.context_chunk import ContextChunk
from app.models.billing import BillingEvent
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


async def _require_admin(user: User) -> User:
    """Require the user to have admin privileges (plan-based for now)."""
    if user.email not in ("admin@contextos.dev",):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


@router.get("/stats")
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get platform-wide statistics (admin only)."""
    await _require_admin(user)

    user_count = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    team_count = (await db.execute(select(func.count()).select_from(Team))).scalar_one()
    integration_count = (await db.execute(select(func.count()).select_from(Integration))).scalar_one()
    chunk_count = (await db.execute(select(func.count()).select_from(ContextChunk))).scalar_one()

    plan_counts = {}
    for plan in ("free", "pro", "enterprise"):
        result = await db.execute(
            select(func.count()).where(User.plan == plan)
        )
        plan_counts[plan] = result.scalar_one()

    logger.info("Admin stats requested by user_id={}", user.id)
    return {
        "users": user_count,
        "teams": team_count,
        "integrations": integration_count,
        "context_chunks": chunk_count,
        "plans": plan_counts,
    }


@router.get("/users")
async def list_users(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List users (admin only)."""
    await _require_admin(user)

    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    users = result.scalars().all()

    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "plan": u.plan,
                "is_active": u.is_active,
                "team_id": u.team_id,
                "query_count_today": u.query_count_today,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
    }


@router.get("/billing/events")
async def list_all_billing_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List all billing events (admin only)."""
    await _require_admin(user)

    total = (await db.execute(select(func.count()).select_from(BillingEvent))).scalar_one()
    result = await db.execute(
        select(BillingEvent)
        .order_by(BillingEvent.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    events = result.scalars().all()

    return {
        "total": total,
        "events": [
            {
                "id": e.id,
                "user_id": e.user_id,
                "event_type": e.event_type,
                "amount": e.amount,
                "currency": e.currency,
                "status": e.status,
                "created_at": e.created_at.isoformat(),
            }
            for e in events
        ],
    }
