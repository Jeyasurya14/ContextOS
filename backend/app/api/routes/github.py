# backend/app/api/routes/github.py

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.core.security import create_oauth_state_token, decode_oauth_state_token
from app.core.encryption import encrypt_token, decrypt_token
from app.core.config import settings
from app.models.user import User
from app.models.integration import Integration
from app.integrations.github import github_integration
from app.api.deps import get_current_user

router = APIRouter(prefix="/integrations/github", tags=["github"])


@router.get("/connect")
async def github_connect(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate GitHub OAuth URL for the user to authorize.

    Returns:
        Dict with oauth_url to redirect the user to.
    """
    state = create_oauth_state_token(current_user.id)
    oauth_url = github_integration.get_oauth_url(current_user.id, state)
    logger.info("GitHub connect initiated for user_id={}", current_user.id)
    return {"oauth_url": oauth_url, "state": state}


@router.get("/callback")
async def github_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle GitHub OAuth callback, exchange code for token, save integration.

    Args:
        code: The authorization code from GitHub.
        state: The CSRF state token containing user_id.

    Returns:
        Dict with success status and redirect URL.
    """
    try:
        logger.info("GitHub callback received: code={} state={}", code[:10] if code else "None", state[:20] if state else "None")
        
        # Decode state token to get user_id
        user_id = decode_oauth_state_token(state)
        logger.info("Decoded user_id from state: {}", user_id)
        
        if not user_id:
            logger.error("Failed to decode state token: {}", state[:50])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state token",
            )

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

        # Check if integration already exists for this user
        existing = await db.execute(
            select(Integration).where(
                Integration.provider == "github",
                Integration.user_id == user_id,
            )
        )
        integration = existing.scalar_one_or_none()

        encrypted_token = encrypt_token(access_token)

        if integration:
            # Update existing integration
            integration.encrypted_access_token = encrypted_token
            integration.provider_username = github_username
            integration.provider_user_id = github_user_id
            integration.is_active = True
            integration.scopes = token_data.get("scope", "")
        else:
            # Create new integration
            integration = Integration(
                user_id=user_id,
                provider="github",
                provider_user_id=github_user_id,
                provider_username=github_username,
                encrypted_access_token=encrypted_token,
                scopes=token_data.get("scope", ""),
                is_active=True,
                sync_status="pending",
            )
            db.add(integration)

        await db.commit()

        logger.info("GitHub OAuth callback successful: user_id={} github_user={}", user_id, github_username)

        from app.workers.github_worker import initial_github_sync
        if integration and integration.user_id:
            decrypted = decrypt_token(integration.encrypted_access_token)
            initial_github_sync.delay(
                integration.user_id, str(integration.id), decrypted
            )

        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?success=github&username={github_username}",
            status_code=302,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("GitHub OAuth callback failed: {}", type(e).__name__)
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?error=github",
            status_code=302,
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


@router.post("/sync")
async def github_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Manually trigger GitHub sync for the current user.

    Returns:
        Dict with sync status.
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

    if not integration.is_active or not integration.encrypted_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub integration is not active",
        )

    integration.sync_status = "syncing"
    await db.commit()

    try:
        access_token = decrypt_token(integration.encrypted_access_token)
        
        # Fetch repos
        repos = await github_integration.get_repos(access_token)
        logger.info("Fetched {} repos for user_id={}", len(repos), current_user.id)
        
        if not repos:
            integration.sync_status = "synced"
            integration.total_chunks = 0
            await db.commit()
            return {
                "message": "No repositories found",
                "repos_synced": 0,
                "total_chunks": 0,
            }
        
        total_chunks = 0
        repos_synced = 0
        
        # Sync first 5 repos to avoid timeout
        for repo in repos[:5]:
            repo_name = repo.get("full_name", "")
            if not repo_name:
                continue
            
            try:
                # Get recent commits
                commits = await github_integration.get_commits(access_token, repo_name)
                
                if not commits:
                    logger.info("Repo {} has no commits, skipping", repo_name)
                    continue
                
                # Process commits
                from app.services.context_processor import context_processor
                for commit in commits[:10]:  # First 10 commits per repo
                    try:
                        commit_text = github_integration.format_commit_as_text(commit, repo_name)
                        if not commit_text or len(commit_text.strip()) < 10:
                            logger.warning("Skipping empty/short commit in {}", repo_name)
                            continue
                            
                        chunks = await context_processor.process_and_store(
                            content=commit_text,
                            source_type="github_commit",
                            source_url=f"https://github.com/{repo_name}/commit/{commit.get('sha', '')}",
                            user_id=current_user.id,
                            integration_id=str(integration.id),
                            metadata={
                                "repo": repo_name,
                                "sha": commit.get("sha", ""),
                                "author": commit.get("commit", {}).get("author", {}).get("name", ""),
                            },
                            db=db,
                        )
                        total_chunks += chunks
                        logger.info("Processed commit {} in {}: {} chunks", commit.get('sha', '')[:7], repo_name, chunks)
                    except Exception as commit_err:
                        logger.error("Failed to process commit in {}: {}", repo_name, str(commit_err))
                        continue
                
                # Flush after each repo to persist data
                await db.flush()
                repos_synced += 1
                logger.info("Completed repo {}: {} total chunks so far", repo_name, total_chunks)
                
            except Exception as repo_err:
                # Skip repos that fail (empty, private, 409 conflict, etc.)
                logger.warning("Failed to sync repo {}: {}", repo_name, str(repo_err))
                continue
        
        integration.sync_status = "synced"
        integration.total_chunks = total_chunks
        integration.last_synced_at = datetime.now(timezone.utc)
        await db.commit()
        
        logger.info("GitHub sync completed: user_id={} repos={} chunks={}", current_user.id, repos_synced, total_chunks)
        return {
            "message": "GitHub sync completed" if total_chunks > 0 else "Sync completed but no data found",
            "repos_synced": repos_synced,
            "total_chunks": total_chunks,
        }
        
    except Exception as e:
        integration.sync_status = "error"
        await db.commit()
        logger.error("GitHub sync failed for user_id={}: {}", current_user.id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}",
        )


@router.delete("/disconnect")
async def github_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
