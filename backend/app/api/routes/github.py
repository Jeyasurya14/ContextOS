# backend/app/api/routes/github.py

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
from app.integrations.github import github_integration
from app.api.routes.auth import get_current_user_from_token

router = APIRouter(prefix="/integrations/github", tags=["github"])


@router.get("/connect")
async def github_connect(
    current_user: User = Depends(get_current_user_from_token),
) -> dict:
    """Generate GitHub OAuth URL for the user to authorize.

    Returns:
        Dict with oauth_url to redirect the user to.
    """
    state = generate_state_token()
    oauth_url = github_integration.get_oauth_url(current_user.id, state)
    logger.info("GitHub connect initiated for user_id={}", current_user.id)
    return {"oauth_url": oauth_url, "state": state}


@router.get("/callback")
async def github_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle GitHub OAuth callback, exchange code for token, save integration.

    Args:
        code: The authorization code from GitHub.
        state: The CSRF state token.

    Returns:
        Dict with success status and redirect URL.
    """
    try:
        token_data = await github_integration.exchange_code_for_token(code)
        access_token = token_data.get("access_token", "")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received from GitHub",
            )

        user_info = await github_integration.get_user_info(access_token)
        github_user_id = str(user_info.get("id", ""))
        github_username = user_info.get("login", "")

        existing = await db.execute(
            select(Integration).where(
                Integration.provider == "github",
                Integration.provider_user_id == github_user_id,
            )
        )
        integration = existing.scalar_one_or_none()

        encrypted_token = encrypt_token(access_token)

        if integration:
            integration.encrypted_access_token = encrypted_token
            integration.provider_username = github_username
            integration.is_active = True
            integration.scopes = token_data.get("scope", "")
        else:
            result = await db.execute(
                select(Integration).where(
                    Integration.provider == "github",
                    Integration.provider_user_id == github_user_id,
                )
            )
            if result.scalar_one_or_none() is None:
                integration = Integration(
                    provider="github",
                    provider_user_id=github_user_id,
                    provider_username=github_username,
                    encrypted_access_token=encrypted_token,
                    scopes=token_data.get("scope", ""),
                    is_active=True,
                    sync_status="pending",
                )
                db.add(integration)

        await db.flush()

        logger.info("GitHub OAuth callback successful: github_user={}", github_username)

        from app.workers.github_worker import initial_github_sync
        if integration and integration.user_id:
            decrypted = decrypt_token(integration.encrypted_access_token)
            initial_github_sync.delay(
                integration.user_id, str(integration.id), decrypted
            )

        return {
            "status": "connected",
            "provider": "github",
            "username": github_username,
            "redirect_url": f"{settings.FRONTEND_URL}/dashboard/integrations",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("GitHub OAuth callback failed: {}", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect GitHub account",
        )


@router.post("/webhook")
async def github_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle incoming GitHub webhook events.

    Verifies signature, returns 200 immediately, processes in Celery.

    Returns:
        Dict with status ok.
    """
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")

    if not github_integration.verify_webhook_signature(
        body, signature, settings.GITHUB_WEBHOOK_SECRET
    ):
        logger.warning("GitHub webhook signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    repo_full_name = payload.get("repository", {}).get("full_name", "")

    result = await db.execute(
        select(Integration).where(
            Integration.provider == "github",
            Integration.is_active == True,
        )
    )
    integrations = result.scalars().all()

    from app.workers.github_worker import process_push_event, process_pr_event, process_issue_event

    for integration in integrations:
        if not integration.encrypted_access_token:
            continue

        try:
            access_token = decrypt_token(integration.encrypted_access_token)
        except ValueError:
            continue

        if event_type == "push":
            process_push_event.delay(
                payload, integration.user_id, str(integration.id), access_token
            )
        elif event_type == "pull_request":
            process_pr_event.delay(
                payload, integration.user_id, str(integration.id)
            )
        elif event_type == "issues":
            process_issue_event.delay(
                payload, integration.user_id, str(integration.id)
            )

    logger.info("GitHub webhook received: event={}, repo={}", event_type, repo_full_name)
    return {"status": "ok"}


@router.delete("/disconnect")
async def github_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
) -> dict:
    """Disconnect GitHub integration for the current user.

    Returns:
        Dict with success message.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == current_user.id,
            Integration.provider == "github",
        )
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub integration not found",
        )

    integration.is_active = False
    integration.encrypted_access_token = None
    await db.flush()

    from app.services.qdrant_service import qdrant_service
    qdrant_service.delete_by_integration(current_user.id, str(integration.id))

    logger.info("GitHub disconnected for user_id={}", current_user.id)
    return {"message": "GitHub integration disconnected"}
