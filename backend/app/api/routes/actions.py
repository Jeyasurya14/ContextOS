# backend/app/api/routes/actions.py
"""
Write actions for connected integrations.

All endpoints authenticate via Bearer JWT OR X-API-Key header, so they work
from both the dashboard and the VS Code extension.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.core.encryption import decrypt_token
from app.core.security import hash_api_key, decode_token
from app.models.user import User
from app.models.integration import Integration
from app.integrations.github import github_integration
from app.integrations.linear import linear_integration
from app.integrations.notion import notion_integration
from app.integrations.slack import slack_integration

router = APIRouter(tags=["actions"])


# ── Auth helpers (Bearer OR API key) ──────────────────────────────────────
async def _user_from_api_key(db: AsyncSession, api_key: str) -> User:
    if not api_key or not api_key.startswith("ctx_"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
    result = await db.execute(
        select(User).where(User.api_key_hash == hash_api_key(api_key))
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def _user_from_bearer(db: AsyncSession, token: str) -> User:
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def require_user(
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(default=""),
    x_api_key: str = Header(alias="X-API-Key", default=""),
) -> User:
    if x_api_key and x_api_key.startswith("ctx_"):
        return await _user_from_api_key(db, x_api_key)
    if authorization and authorization.startswith("Bearer "):
        return await _user_from_bearer(db, authorization[7:])
    raise HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Provide either Authorization: Bearer <jwt> or X-API-Key: ctx_…",
    )


async def _get_access_token(
    db: AsyncSession, user_id: str, provider: str
) -> str:
    """Fetch & decrypt the access token for a user's provider integration."""
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == user_id,
            Integration.provider == provider,
            Integration.is_active == True,  # noqa: E712
        )
    )
    integration = result.scalar_one_or_none()
    if integration is None or not integration.encrypted_access_token:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{provider.capitalize()} is not connected. Connect it in the dashboard first.",
        )
    try:
        return decrypt_token(integration.encrypted_access_token)
    except Exception as e:
        logger.error("Token decryption failed for user={} provider={}: {}", user_id, provider, type(e).__name__)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Failed to decrypt {provider} token. Reconnect the integration.",
        )


# ── GitHub ────────────────────────────────────────────────────────────────
@router.get("/github/repos")
async def github_list_repos(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> list[dict]:
    token = await _get_access_token(db, user.id, "github")
    try:
        return await github_integration.list_user_repos(token, limit=50)
    except Exception as e:
        logger.error("GitHub list_repos failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "GitHub API error")


class GithubIssueCreate(BaseModel):
    repo: str = Field(..., description="owner/repo format")
    title: str
    body: str = ""
    labels: list[str] | None = None


@router.post("/github/issue")
async def github_create_issue(
    data: GithubIssueCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict:
    token = await _get_access_token(db, user.id, "github")
    try:
        return await github_integration.create_issue(
            token, data.repo, data.title, data.body, data.labels
        )
    except Exception as e:
        logger.error("GitHub create_issue failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"GitHub API error: {e}")


class GithubPRCreate(BaseModel):
    repo: str
    title: str
    head: str
    base: str = "main"
    body: str = ""
    draft: bool = False


@router.post("/github/pr")
async def github_create_pr(
    data: GithubPRCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict:
    token = await _get_access_token(db, user.id, "github")
    try:
        return await github_integration.create_pull_request(
            token, data.repo, data.title, data.head, data.base, data.body, data.draft
        )
    except Exception as e:
        logger.error("GitHub create_pr failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"GitHub API error: {e}")


class GithubComment(BaseModel):
    repo: str
    issue_number: int
    body: str


@router.post("/github/comment")
async def github_comment(
    data: GithubComment,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict:
    token = await _get_access_token(db, user.id, "github")
    try:
        return await github_integration.post_pr_comment(
            token, data.repo, data.issue_number, data.body
        )
    except Exception as e:
        logger.error("GitHub comment failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"GitHub API error: {e}")


# ── Linear ────────────────────────────────────────────────────────────────
@router.get("/linear/teams")
async def linear_list_teams(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> list[dict]:
    token = await _get_access_token(db, user.id, "linear")
    try:
        return await linear_integration.list_teams(token)
    except Exception as e:
        logger.error("Linear list_teams failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Linear API error")


class LinearIssueCreate(BaseModel):
    team_id: str
    title: str
    description: str = ""


@router.post("/linear/issue")
async def linear_create_issue(
    data: LinearIssueCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict:
    token = await _get_access_token(db, user.id, "linear")
    try:
        return await linear_integration.create_issue(
            token, data.team_id, data.title, data.description
        )
    except Exception as e:
        logger.error("Linear create_issue failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Linear API error: {e}")


class LinearComment(BaseModel):
    issue_id: str
    body: str


@router.post("/linear/comment")
async def linear_comment(
    data: LinearComment,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict:
    token = await _get_access_token(db, user.id, "linear")
    try:
        return await linear_integration.add_comment(token, data.issue_id, data.body)
    except Exception as e:
        logger.error("Linear comment failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Linear API error: {e}")


# ── Notion ────────────────────────────────────────────────────────────────
class NotionPageCreate(BaseModel):
    title: str
    content: str = ""
    parent_page_id: str | None = None


@router.post("/notion/page")
async def notion_create_page(
    data: NotionPageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict:
    token = await _get_access_token(db, user.id, "notion")
    try:
        return await notion_integration.create_page(
            token, data.title, data.content, data.parent_page_id
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        logger.error("Notion create_page failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Notion API error: {e}")


# ── Slack ─────────────────────────────────────────────────────────────────
@router.get("/slack/channels")
async def slack_list_channels(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> list[dict]:
    token = await _get_access_token(db, user.id, "slack")
    try:
        return await slack_integration.list_channels(token, limit=100)
    except Exception as e:
        logger.error("Slack list_channels failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Slack API error")


class SlackMessage(BaseModel):
    channel: str = Field(..., description="Channel ID or name (e.g. #general)")
    text: str


@router.post("/slack/message")
async def slack_send_message(
    data: SlackMessage,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict:
    token = await _get_access_token(db, user.id, "slack")
    try:
        return await slack_integration.post_message(token, data.channel, data.text)
    except Exception as e:
        logger.error("Slack message failed: {}", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Slack API error: {e}")
