# backend/app/api/routes/notion.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.core.security import generate_state_token
from app.core.encryption import encrypt_token, decrypt_token
from app.core.config import settings
from app.models.user import User
from app.models.integration import Integration
from app.integrations.notion import notion_integration
from app.api.routes.auth import get_current_user_from_token

router = APIRouter(prefix="/integrations/notion", tags=["notion"])


@router.get("/connect")
async def notion_connect(
    current_user: User = Depends(get_current_user_from_token),
) -> dict:
    """Generate Notion OAuth URL for the user to authorize.

    Returns:
        Dict with oauth_url to redirect the user to.
    """
    state = generate_state_token()
    oauth_url = notion_integration.get_oauth_url(current_user.id, state)
    logger.info("Notion connect initiated for user_id={}", current_user.id)
    return {"oauth_url": oauth_url, "state": state}


@router.get("/callback")
async def notion_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle Notion OAuth callback.

    Args:
        code: Authorization code from Notion.
        state: CSRF state token.

    Returns:
        Dict with connection status and redirect URL.
    """
    try:
        token_data = await notion_integration.exchange_code_for_token(code)
        access_token = token_data.get("access_token", "")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received from Notion",
            )

        workspace_id = token_data.get("workspace_id", "")
        workspace_name = token_data.get("workspace_name", "")
        owner = token_data.get("owner", {})
        notion_user_id = owner.get("user", {}).get("id", "") if owner.get("type") == "user" else ""

        encrypted_token = encrypt_token(access_token)

        existing = await db.execute(
            select(Integration).where(
                Integration.provider == "notion",
                Integration.provider_user_id == workspace_id,
            )
        )
        integration = existing.scalar_one_or_none()

        if integration:
            integration.encrypted_access_token = encrypted_token
            integration.provider_username = workspace_name
            integration.is_active = True
        else:
            integration = Integration(
                provider="notion",
                provider_user_id=workspace_id,
                provider_username=workspace_name,
                encrypted_access_token=encrypted_token,
                is_active=True,
                sync_status="pending",
            )
            db.add(integration)

        await db.flush()

        logger.info("Notion OAuth callback successful: workspace={}", workspace_name)

        from app.workers.notion_worker import initial_notion_sync
        if integration and integration.user_id:
            decrypted = decrypt_token(integration.encrypted_access_token)
            initial_notion_sync.delay(
                integration.user_id, str(integration.id), decrypted
            )

        return {
            "status": "connected",
            "provider": "notion",
            "workspace": workspace_name,
            "redirect_url": f"{settings.FRONTEND_URL}/dashboard/integrations",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Notion OAuth callback failed: {}", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect Notion account",
        )


@router.post("/sync")
async def notion_manual_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
) -> dict:
    """Trigger a manual Notion sync for the current user.

    Returns:
        Dict with sync status.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "notion",
            Integration.is_active == True,
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notion integration not found",
        )

    if not integration.encrypted_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notion access token missing. Please reconnect.",
        )

    from app.workers.notion_worker import sync_notion_changes
    access_token = decrypt_token(integration.encrypted_access_token)
    sync_notion_changes.delay(current_user.id, str(integration.id), access_token)

    integration.sync_status = "syncing"
    await db.flush()

    logger.info("Manual Notion sync triggered for user_id={}", current_user.id)
    return {"status": "syncing", "message": "Notion sync started"}


@router.delete("/disconnect")
async def notion_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
) -> dict:
    """Disconnect Notion integration.

    Returns:
        Dict with success message.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "notion",
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notion integration not found",
        )

    integration.is_active = False
    integration.encrypted_access_token = None
    await db.flush()

    from app.services.qdrant_service import qdrant_service
    qdrant_service.delete_by_integration(current_user.id, str(integration.id))

    logger.info("Notion disconnected for user_id={}", current_user.id)
    return {"message": "Notion integration disconnected"}
