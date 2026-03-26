# backend/app/api/routes/google_drive.py

from datetime import datetime, timezone
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
from app.integrations.google_drive import google_drive_integration
from app.api.deps import get_current_user

router = APIRouter(tags=["google"])


@router.get("/connect")
async def google_connect(
    current_user: User = Depends(get_current_user),
) -> dict:
    state = create_oauth_state_token(current_user.id)
    oauth_url = google_drive_integration.get_oauth_url(current_user.id, state)
    logger.info("Google connect initiated for user_id={}", current_user.id)
    return {"url": oauth_url, "state": state}


@router.get("/callback")
async def google_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = decode_oauth_state_token(state)
        if not user_id:
            logger.error("Failed to decode state token: {}", state[:50])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state token",
            )

        token_data = await google_drive_integration.exchange_code_for_token(code)
        access_token = token_data.get("access_token", "")
        refresh_token = token_data.get("refresh_token", "")  # Only sent on first consent

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received from Google",
            )

        user_info = await google_drive_integration.get_user_info(access_token)
        google_user_id = user_info.get("id", "")
        google_email = user_info.get("email", "")

        existing = await db.execute(
            select(Integration).where(
                Integration.provider == "google",
                Integration.user_id == user_id,
            )
        )
        integration = existing.scalar_one_or_none()

        encrypted_token = encrypt_token(access_token)
        scopes = token_data.get("scope", "")

        if integration:
            integration.encrypted_access_token = encrypted_token
            if refresh_token:
                # Store the refresh token securely as part of the meta data or a separate col.
                # Since the current models don't have a refresh_token column, 
                # we will store it in metadata if we need it later, or extend the model.
                from app.core.encryption import encrypt_token
                integration.metadata_json = f'{{"encrypted_refresh_token": "{encrypt_token(refresh_token)}" }}'

            integration.provider_username = google_email
            integration.provider_user_id = google_user_id
            integration.is_active = True
            integration.scopes = scopes
        else:
            integration = Integration(
                user_id=user_id,
                provider="google",
                provider_user_id=google_user_id,
                provider_username=google_email,
                encrypted_access_token=encrypted_token,
                scopes=scopes,
                is_active=True,
                sync_status="pending",
            )
            if refresh_token:
                integration.metadata_json = f'{{"encrypted_refresh_token": "{encrypt_token(refresh_token)}" }}'
            db.add(integration)

        await db.commit()
        logger.info("Google OAuth callback successful: user_id={} google_user={}", user_id, google_email)

        # Trigger sync worker
        from app.workers.google_worker import initial_google_sync
        if integration and integration.user_id:
            decrypted = decrypt_token(integration.encrypted_access_token)
            initial_google_sync.delay(
                integration.user_id, str(integration.id), decrypted
            )

        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?success=google&username={google_email}",
            status_code=302,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Google OAuth callback failed: {}", type(e).__name__)
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?error=google",
            status_code=302,
        )


@router.post("/sync")
async def google_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "google",
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None or not integration.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google integration not active",
        )

    integration.sync_status = "syncing"
    await db.commit()

    try:
        access_token = decrypt_token(integration.encrypted_access_token)
        from app.workers.google_worker import sync_google_changes
        sync_google_changes.delay(current_user.id, str(integration.id), access_token)
        
        return {"message": "Google sync triggered"}
    except Exception as e:
        integration.sync_status = "error"
        await db.commit()
        logger.error("Google sync trigger failed: {}", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}",
        )


@router.delete("/disconnect")
async def google_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "google",
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Google integration not found",
        )

    integration.is_active = False
    integration.encrypted_access_token = None
    integration.metadata_json = None
    await db.flush()

    from app.services.qdrant_service import qdrant_service
    qdrant_service.delete_by_integration(current_user.id, str(integration.id))

    logger.info("Google disconnected for user_id={}", current_user.id)
    return {"message": "Google integration disconnected"}
