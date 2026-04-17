# backend/app/api/routes/integrations.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.models.user import User
from app.models.integration import Integration
from app.api.deps import get_current_user

router = APIRouter(tags=["integrations"])


@router.get("")
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """List all integrations for the current user.

    Returns:
        List of integration summary dicts.
    """
    result = await db.execute(
        select(Integration).where(Integration.user_id == current_user.id)
    )
    integrations = result.scalars().all()

    return [
        {
            "id": i.id,
            "provider": i.provider,
            "provider_username": i.provider_username,
            "is_active": i.is_active,
            "total_chunks": i.total_chunks,
            "sync_status": i.sync_status,
            "last_synced_at": i.last_synced_at.isoformat() if i.last_synced_at else None,
            "created_at": i.created_at.isoformat(),
        }
        for i in integrations
    ]


@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get integration stats for the current user.

    Returns:
        Dict with total chunks and integration counts.
    """
    from sqlalchemy import func
    from app.models.context_chunk import ContextChunk
    from app.models.conversation import Conversation
    
    result = await db.execute(
        select(Integration).where(Integration.user_id == current_user.id)
    )
    integrations = result.scalars().all()
    
    chunks_result = await db.execute(
        select(func.count(ContextChunk.id)).where(ContextChunk.user_id == current_user.id)
    )
    total_chunks = chunks_result.scalar() or 0
    
    conversations_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.user_id == current_user.id)
    )
    total_conversations = conversations_result.scalar() or 0
    
    return {
        "total_chunks": total_chunks,
        "total_integrations": len(integrations),
        "active_integrations": len([i for i in integrations if i.is_active]),
        "total_conversations": total_conversations,
    }


@router.get("/{integration_id}")
async def get_integration(
    integration_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get details of a specific integration.

    Returns:
        Integration detail dict.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.user_id == current_user.id,
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    return {
        "id": integration.id,
        "provider": integration.provider,
        "provider_username": integration.provider_username,
        "provider_user_id": integration.provider_user_id,
        "is_active": integration.is_active,
        "total_chunks": integration.total_chunks,
        "sync_status": integration.sync_status,
        "scopes": integration.scopes,
        "last_synced_at": integration.last_synced_at.isoformat() if integration.last_synced_at else None,
        "created_at": integration.created_at.isoformat(),
        "updated_at": integration.updated_at.isoformat(),
    }


@router.get("/status/all")
async def integration_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get connection status for all integration providers.

    Returns:
        Dict mapping provider names to their connection status.
    """
    result = await db.execute(
        select(Integration).where(Integration.user_id == current_user.id)
    )
    integrations = result.scalars().all()

    status_map: dict[str, dict] = {
        "github": {"connected": False, "username": None, "chunks": 0, "last_synced": None},
        "notion": {"connected": False, "username": None, "chunks": 0, "last_synced": None},
        "slack": {"connected": False, "username": None, "chunks": 0, "last_synced": None},
        "vscode": {"connected": False, "username": None, "chunks": 0, "last_synced": None},
    }

    for integration in integrations:
        provider = integration.provider
        if provider in status_map:
            status_map[provider] = {
                "connected": integration.is_active,
                "username": integration.provider_username,
                "chunks": integration.total_chunks or 0,
                "last_synced": integration.last_synced_at.isoformat() if integration.last_synced_at else None,
            }

    return status_map
