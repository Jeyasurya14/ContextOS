# backend/app/api/routes/admin.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.team import Team
from app.models.integration import Integration
from app.models.context_chunk import ContextChunk
from app.models.billing import BillingEvent
from app.models.conversation import Conversation
from app.api.deps_admin import get_current_admin_user

router = APIRouter(tags=["admin"])


class UserUpdate(BaseModel):
    """Schema for updating user details."""
    full_name: str | None = None
    plan: str | None = None
    is_active: bool | None = None
    is_admin: bool | None = None


@router.get("/stats")
async def get_admin_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get platform-wide statistics (admin only)."""
    
    # User stats
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    active_users = (await db.execute(
        select(func.count()).where(User.is_active == True)
    )).scalar_one()
    
    # Plan distribution
    plan_counts = {}
    for plan in ("free", "pro", "team"):
        result = await db.execute(
            select(func.count()).where(User.plan == plan)
        )
        plan_counts[plan] = result.scalar_one()
    
    # Integration stats
    total_integrations = (await db.execute(
        select(func.count()).select_from(Integration)
    )).scalar_one()
    active_integrations = (await db.execute(
        select(func.count()).where(Integration.is_active == True)
    )).scalar_one()
    
    # Context chunks
    total_chunks = (await db.execute(
        select(func.count()).select_from(ContextChunk)
    )).scalar_one()
    
    # Conversations
    total_conversations = (await db.execute(
        select(func.count()).select_from(Conversation)
    )).scalar_one()
    
    # Teams
    total_teams = (await db.execute(
        select(func.count()).select_from(Team)
    )).scalar_one()

    logger.info("Admin stats requested by admin_id={}", current_admin.id)
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
        },
        "plans": plan_counts,
        "integrations": {
            "total": total_integrations,
            "active": active_integrations,
        },
        "context_chunks": total_chunks,
        "conversations": total_conversations,
        "teams": total_teams,
    }


@router.get("/users")
async def list_all_users(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
    plan: str | None = None,
    is_active: bool | None = None,
) -> dict:
    """List all users with filtering (admin only)."""
    
    # Build query
    query = select(User)
    
    # Apply filters
    if search:
        query = query.where(
            (User.email.ilike(f"%{search}%")) | 
            (User.full_name.ilike(f"%{search}%"))
        )
    if plan:
        query = query.where(User.plan == plan)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    # Get users
    query = query.order_by(desc(User.created_at)).limit(limit).offset(offset)
    result = await db.execute(query)
    users = result.scalars().all()

    logger.info("Admin listed {} users (admin_id={})", len(users), current_admin.id)
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "plan": u.plan,
                "is_active": u.is_active,
                "is_admin": u.is_admin,
                "is_verified": u.is_verified,
                "team_id": u.team_id,
                "query_count_today": u.query_count_today,
                "created_at": u.created_at.isoformat(),
                "updated_at": u.updated_at.isoformat(),
            }
            for u in users
        ],
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get detailed information about a specific user (admin only)."""
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's integrations
    integrations_result = await db.execute(
        select(Integration).where(Integration.user_id == user_id)
    )
    integrations = integrations_result.scalars().all()
    
    # Get user's conversations count
    conversations_count = (await db.execute(
        select(func.count()).where(Conversation.user_id == user_id)
    )).scalar_one()
    
    # Get user's context chunks count
    chunks_count = (await db.execute(
        select(func.count()).where(ContextChunk.user_id == user_id)
    )).scalar_one()
    
    logger.info("Admin viewed user details for user_id={} (admin_id={})", user_id, current_admin.id)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "plan": user.plan,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "is_verified": user.is_verified,
        "team_id": user.team_id,
        "team_role": user.team_role,
        "query_count_today": user.query_count_today,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
        "integrations": [
            {
                "id": i.id,
                "provider": i.provider,
                "is_active": i.is_active,
                "total_chunks": i.total_chunks,
                "sync_status": i.sync_status,
                "last_synced_at": i.last_synced_at.isoformat() if i.last_synced_at else None,
            }
            for i in integrations
        ],
        "stats": {
            "conversations": conversations_count,
            "context_chunks": chunks_count,
        }
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update user details (admin only)."""
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.plan is not None:
        user.plan = user_update.plan
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.is_admin is not None:
        user.is_admin = user_update.is_admin
    
    await db.commit()
    await db.refresh(user)
    
    logger.info("Admin updated user_id={} (admin_id={})", user_id, current_admin.id)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "plan": user.plan,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "updated_at": user.updated_at.isoformat(),
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a user and all their data (admin only)."""
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting yourself
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )
    
    # Delete user (cascade will handle related records)
    await db.delete(user)
    await db.commit()
    
    logger.warning("Admin deleted user_id={} (admin_id={})", user_id, current_admin.id)
    
    return {"message": "User deleted successfully"}


@router.get("/integrations")
async def list_all_integrations(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    provider: str | None = None,
) -> dict:
    """List all integrations across all users (admin only)."""
    
    query = select(Integration)
    
    if provider:
        query = query.where(Integration.provider == provider)
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    # Get integrations
    query = query.order_by(desc(Integration.created_at)).limit(limit).offset(offset)
    result = await db.execute(query)
    integrations = result.scalars().all()
    
    return {
        "total": total,
        "integrations": [
            {
                "id": i.id,
                "user_id": i.user_id,
                "provider": i.provider,
                "provider_username": i.provider_username,
                "is_active": i.is_active,
                "total_chunks": i.total_chunks,
                "sync_status": i.sync_status,
                "last_synced_at": i.last_synced_at.isoformat() if i.last_synced_at else None,
                "created_at": i.created_at.isoformat(),
            }
            for i in integrations
        ],
    }


@router.get("/billing/events")
async def list_all_billing_events(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List all billing events (admin only)."""
    
    total = (await db.execute(select(func.count()).select_from(BillingEvent))).scalar_one()
    result = await db.execute(
        select(BillingEvent)
        .order_by(desc(BillingEvent.created_at))
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

