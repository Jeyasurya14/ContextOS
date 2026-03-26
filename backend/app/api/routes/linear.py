# backend/app/api/routes/linear.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.core.security import create_oauth_state_token, decode_oauth_state_token
from app.core.encryption import encrypt_token, decrypt_token
from app.core.config import settings
from app.models.user import User
from app.models.integration import Integration
from app.integrations.linear import linear_integration
from app.api.deps import get_current_user

router = APIRouter(tags=["linear"])


@router.get("/connect")
async def linear_connect(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate Linear OAuth URL for the user to authorize."""
    state = create_oauth_state_token(current_user.id)
    oauth_url = linear_integration.get_oauth_url(current_user.id, state)
    logger.info("Linear connect initiated for user_id={}", current_user.id)
    return {"url": oauth_url, "state": state}


@router.get("/callback")
async def linear_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle Linear OAuth callback."""
    try:
        user_id = decode_oauth_state_token(state)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state token",
            )

        token_data = await linear_integration.exchange_code_for_token(code)
        access_token = token_data.get("access_token", "")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received from Linear",
            )

        org_data = await linear_integration.get_organization(access_token)
        workspace_id = org_data.get("id", "unknown")
        workspace_name = org_data.get("name", "Linear Workspace")

        encrypted_token = encrypt_token(access_token)

        existing = await db.execute(
            select(Integration).where(
                Integration.provider == "linear",
                Integration.user_id == user_id,
            )
        )
        integration = existing.scalar_one_or_none()

        if integration:
            integration.encrypted_access_token = encrypted_token
            integration.provider_username = workspace_name
            integration.is_active = True
        else:
            integration = Integration(
                user_id=user_id,
                provider="linear",
                provider_user_id=workspace_id,
                provider_username=workspace_name,
                encrypted_access_token=encrypted_token,
                is_active=True,
                sync_status="pending",
            )
            db.add(integration)

        await db.commit()

        logger.info("Linear OAuth callback successful: workspace={}", workspace_name)

        from app.workers.linear_worker import initial_linear_sync
        if integration and integration.user_id:
            decrypted = decrypt_token(integration.encrypted_access_token)
            initial_linear_sync.delay(
                integration.user_id, str(integration.id), decrypted
            )

        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?success=linear&workspace={workspace_name}",
            status_code=302,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Linear OAuth callback failed: {}", type(e).__name__)
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?error=linear",
            status_code=302,
        )


@router.post("/sync")
async def linear_manual_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Trigger a manual Linear sync for the current user."""
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "linear",
            Integration.is_active == True,
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linear integration not found",
        )

    if not integration.encrypted_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Linear access token missing. Please reconnect.",
        )

    from app.workers.linear_worker import sync_linear_changes
    access_token = decrypt_token(integration.encrypted_access_token)
    sync_linear_changes.delay(current_user.id, str(integration.id), access_token)

    integration.sync_status = "syncing"
    await db.flush()
    await db.commit()

    logger.info("Manual Linear sync triggered for user_id={}", current_user.id)
    return {"status": "syncing", "message": "Linear sync started"}


@router.delete("/disconnect")
async def linear_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Disconnect Linear integration."""
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "linear",
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linear integration not found",
        )

    integration.is_active = False
    integration.encrypted_access_token = None
    await db.flush()
    await db.commit()

    from app.services.qdrant_service import qdrant_service
    qdrant_service.delete_by_integration(current_user.id, str(integration.id))

    logger.info("Linear disconnected for user_id={}", current_user.id)
    return {"message": "Linear integration disconnected"}
