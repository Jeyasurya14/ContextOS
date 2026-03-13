# backend/app/api/routes/slack.py

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.core.security import generate_state_token
from app.core.encryption import encrypt_token, decrypt_token
from app.core.config import settings
from app.models.user import User
from app.models.integration import Integration
from app.integrations.slack import slack_integration
from app.api.deps import get_current_user

router = APIRouter(tags=["slack"])


@router.get("/connect")
async def slack_connect(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate Slack OAuth URL for the user to authorize.

    Returns:
        Dict with oauth_url to redirect the user to.
    """
    state = generate_state_token()
    oauth_url = slack_integration.get_oauth_url(current_user.id, state)
    logger.info("Slack connect initiated for user_id={}", current_user.id)
    return {"oauth_url": oauth_url, "state": state}


@router.get("/callback")
async def slack_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle Slack OAuth callback.

    Args:
        code: Authorization code from Slack.
        state: CSRF state token.

    Returns:
        Dict with connection status and redirect URL.
    """
    try:
        token_data = await slack_integration.exchange_code_for_token(code)
        access_token = token_data.get("access_token", "")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received from Slack",
            )

        team = token_data.get("team", {})
        team_id = team.get("id", "")
        team_name = team.get("name", "")

        encrypted_token = encrypt_token(access_token)

        existing = await db.execute(
            select(Integration).where(
                Integration.provider == "slack",
                Integration.provider_user_id == team_id,
            )
        )
        integration = existing.scalar_one_or_none()

        if integration:
            integration.encrypted_access_token = encrypted_token
            integration.provider_username = team_name
            integration.is_active = True
        else:
            integration = Integration(
                provider="slack",
                provider_user_id=team_id,
                provider_username=team_name,
                encrypted_access_token=encrypted_token,
                is_active=True,
                sync_status="pending",
            )
            db.add(integration)

        await db.flush()

        logger.info("Slack OAuth callback successful: team={}", team_name)

        from app.workers.slack_worker import initial_slack_sync
        if integration and integration.user_id:
            decrypted = decrypt_token(integration.encrypted_access_token)
            initial_slack_sync.delay(
                integration.user_id, str(integration.id), decrypted
            )

        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?success=slack&team={team_name}",
            status_code=302,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Slack OAuth callback failed: {}", type(e).__name__)
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?error=slack",
            status_code=302,
        )


@router.post("/events")
async def slack_events(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle Slack Events API (URL verification + message events).

    Returns 200 immediately, processes messages in Celery.

    Returns:
        Dict with status or challenge response.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    if payload.get("type") == "url_verification":
        return {"challenge": payload.get("challenge", "")}

    body = (await request.body()).decode("utf-8")
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")

    if not slack_integration.verify_slack_signature(
        body, timestamp, signature, settings.SLACK_SIGNING_SECRET
    ):
        logger.warning("Slack event signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Slack signature",
        )

    event = payload.get("event", {})
    event_type = event.get("type", "")

    if event_type == "message" and not event.get("subtype"):
        team_id = payload.get("team_id", "")

        result = await db.execute(
            select(Integration).where(
                Integration.provider == "slack",
                Integration.provider_user_id == team_id,
                Integration.is_active == True,
            )
        )
        integration = result.scalar_one_or_none()

        if integration:
            from app.workers.slack_worker import process_slack_message
            process_slack_message.delay(
                event, integration.user_id, str(integration.id)
            )

    return {"status": "ok"}


@router.post("/sync")
async def slack_manual_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Trigger a manual Slack sync for the current user.

    Returns:
        Dict with sync status.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "slack",
            Integration.is_active == True,
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slack integration not found",
        )

    if not integration.encrypted_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack access token missing. Please reconnect.",
        )

    from app.workers.slack_worker import sync_slack_changes
    access_token = decrypt_token(integration.encrypted_access_token)
    sync_slack_changes.delay(current_user.id, str(integration.id), access_token)

    integration.sync_status = "syncing"
    await db.flush()

    logger.info("Manual Slack sync triggered for user_id={}", current_user.id)
    return {"status": "syncing", "message": "Slack sync started"}


@router.delete("/disconnect")
async def slack_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Disconnect Slack integration.

    Returns:
        Dict with success message.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "slack",
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slack integration not found",
        )

    integration.is_active = False
    integration.encrypted_access_token = None
    await db.flush()

    from app.services.qdrant_service import qdrant_service
    qdrant_service.delete_by_integration(current_user.id, str(integration.id))

    logger.info("Slack disconnected for user_id={}", current_user.id)
    return {"message": "Slack integration disconnected"}
