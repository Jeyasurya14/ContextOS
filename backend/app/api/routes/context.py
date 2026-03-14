# backend/app/api/routes/context.py

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from loguru import logger

from app.core.database import get_db
from app.core.security import hash_api_key
from app.models.user import User
from app.models.context_chunk import ContextChunk
from app.api.deps import get_current_user
from app.services.context_processor import context_processor
from app.services.qdrant_service import delete_by_user

router = APIRouter(tags=["context"])


async def _extract_api_key(
    x_api_key: str = Header(alias="X-API-Key", default=""),
) -> str:
    """Extract the X-API-Key header value."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key header is required",
        )
    return x_api_key


class FileContext(BaseModel):
    """Schema for a single file in workspace sync."""
    path: str
    content: str
    language: str = ""
    isActive: bool = False


class SyncRequest(BaseModel):
    """Schema for workspace context sync from VS Code extension."""
    files: list[FileContext] = []
    git_log: list[dict] = []
    diagnostics: list[dict] = []
    folderStructure: str = ""


class SyncResponse(BaseModel):
    """Schema for sync response."""
    chunks_added: int


async def get_user_from_api_key(
    db: AsyncSession,
    api_key: str,
) -> User:
    """Resolve a user from an API key.

    Args:
        db: Active async database session.
        api_key: The raw API key string (ctx_xxxxx).

    Returns:
        The authenticated User.

    Raises:
        HTTPException: If the API key is invalid.
    """
    if not api_key or not api_key.startswith("ctx_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format",
        )

    hashed = hash_api_key(api_key)
    result = await db.execute(
        select(User).where(User.api_key_hash == hashed)
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )

    return user


@router.post("/sync", response_model=SyncResponse)
async def sync_workspace_context(
    data: SyncRequest,
    x_api_key: str = Depends(_extract_api_key),
    db: AsyncSession = Depends(get_db),
) -> SyncResponse:
    """Sync workspace context from VS Code extension.

    Receives files, git log, and diagnostics from the extension
    and stores them as context chunks.

    Returns:
        SyncResponse with number of chunks added.
    """
    user = await get_user_from_api_key(db, x_api_key)
    total_chunks = 0

    for file_ctx in data.files:
        if not file_ctx.content or len(file_ctx.content.strip()) < 10:
            continue

        content = (
            f"[VS Code File] {file_ctx.path}\n"
            f"Language: {file_ctx.language}\n"
            f"Active: {file_ctx.isActive}\n"
            f"---\n"
            f"{file_ctx.content}"
        )

        chunks = await context_processor.process_and_store(
            content=content,
            source_type="vscode_file",
            source_url=file_ctx.path,
            user_id=user.id,
            integration_id=None,
            metadata={
                "path": file_ctx.path,
                "language": file_ctx.language,
                "is_active": file_ctx.isActive,
            },
            db=db,
        )
        total_chunks += chunks

    if data.git_log:
        git_text_parts = ["[VS Code Git Log]"]
        for entry in data.git_log[:10]:
            git_text_parts.append(
                f"- {entry.get('hash', '')[:7]} {entry.get('message', '')} "
                f"by {entry.get('author', '')} on {entry.get('date', '')}"
            )
            diff = entry.get("diff", "")
            if diff:
                git_text_parts.append(f"  {diff[:300]}")

        git_text = "\n".join(git_text_parts)
        if len(git_text) > 50:
            chunks = await context_processor.process_and_store(
                content=git_text,
                source_type="vscode_file",
                source_url="git://log",
                user_id=user.id,
                integration_id=None,
                metadata={"type": "git_log"},
                db=db,
            )
            total_chunks += chunks

    if data.diagnostics:
        diag_parts = ["[VS Code Diagnostics]"]
        for d in data.diagnostics[:20]:
            diag_parts.append(
                f"- {d.get('file', '')}:{d.get('line', '')} "
                f"[{d.get('severity', '')}] {d.get('message', '')}"
            )

        diag_text = "\n".join(diag_parts)
        if len(diag_text) > 50:
            chunks = await context_processor.process_and_store(
                content=diag_text,
                source_type="vscode_file",
                source_url="vscode://diagnostics",
                user_id=user.id,
                integration_id=None,
                metadata={"type": "diagnostics"},
                db=db,
            )
            total_chunks += chunks

    logger.info("Workspace sync: user_id={}, chunks_added={}", user.id, total_chunks)
    return SyncResponse(chunks_added=total_chunks)


@router.get("/stats")
async def context_stats(
    db: AsyncSession = Depends(get_db),
    x_api_key: str = Depends(_extract_api_key),
) -> dict:
    """Get context statistics for the authenticated user.

    Returns:
        Dict with total chunks, breakdown by source type.
    """
    user = await get_user_from_api_key(db, x_api_key)

    total_result = await db.execute(
        select(func.count(ContextChunk.id)).where(
            ContextChunk.user_id == user.id
        )
    )
    total = total_result.scalar_one()

    breakdown_result = await db.execute(
        select(
            ContextChunk.source_type,
            func.count(ContextChunk.id),
        )
        .where(ContextChunk.user_id == user.id)
        .group_by(ContextChunk.source_type)
    )
    breakdown = {row[0]: row[1] for row in breakdown_result.all()}

    return {
        "total_chunks": total,
        "by_source": breakdown,
    }


@router.delete("/all")
async def clear_all_context(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Delete all stored context chunks for the current authenticated user."""
    await delete_by_user(str(current_user.id))

    result = await db.execute(
        select(ContextChunk).where(ContextChunk.user_id == current_user.id)
    )
    chunks = result.scalars().all()
    deleted_count = len(chunks)
    for chunk in chunks:
        await db.delete(chunk)

    # Reset per-integration chunk counters after context deletion.
    for integration in current_user.integrations or []:
        integration.total_chunks = 0
        integration.sync_status = "pending" if integration.is_active else integration.sync_status

    await db.flush()

    logger.info("All context cleared for user_id={}, deleted_chunks={}", current_user.id, deleted_count)
    return {"message": "All context cleared successfully", "deleted_chunks": deleted_count}

