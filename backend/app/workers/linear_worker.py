# backend/app/workers/linear_worker.py

import asyncio
from datetime import datetime, timezone

from loguru import logger
from sqlalchemy import select

from app.workers.celery_app import celery_app
from app.integrations.linear import linear_integration
from app.core.database import async_session_factory
from app.models.integration import Integration
from app.services.context_processor import context_processor


def run_async(coro):
    """Helper to run async coroutines in sync Celery workers."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _run_initial_linear_sync(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of initial Linear sync."""
    total_chunks = 0

    try:
        issues = await linear_integration.get_issues(access_token)
        logger.info("Fetched {} Linear issues for user_id={}", len(issues), user_id)

        async with async_session_factory() as db:
            for issue in issues:
                issue_id = issue.get("id", "")
                try:
                    title = issue.get("title", "")
                    desc = issue.get("description", "") or ""
                    state = issue.get("state", {}).get("name", "Unknown")
                    assignee = issue.get("assignee", {}).get("name", "Unassigned")
                    
                    content = f"[Linear Issue: {title}]\nState: {state}\nAssignee: {assignee}\n\n{desc}"
                    
                    if len(content.strip()) < 10:
                        continue

                    chunks = await context_processor.process_and_store(
                        content=content,
                        source_type="linear",
                        source_url=issue.get("url", ""),
                        user_id=user_id,
                        integration_id=integration_id,
                        metadata={
                            "issue_id": issue_id,
                            "updated_at": issue.get("updatedAt", ""),
                        },
                        db=db,
                    )
                    total_chunks += chunks
                except Exception as e:
                    logger.error("Failed syncing Linear issue {}: {}", issue_id[:8], type(e).__name__)

            result = await db.execute(
                select(Integration).where(Integration.id == integration_id)
            )
            integration = result.scalar_one_or_none()
            
            if integration:
                integration.last_synced_at = datetime.now(timezone.utc)
                integration.total_chunks = (integration.total_chunks or 0) + total_chunks
                integration.sync_status = "active"

            await db.commit()

    except Exception as e:
        logger.error("Initial Linear sync failed for user_id={}: {}", user_id, type(e).__name__)
        raise

    logger.info("Initial Linear sync complete: user_id={}, chunks={}", user_id, total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def initial_linear_sync(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Run initial Linear sync for a user."""
    try:
        return run_async(
            _run_initial_linear_sync(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("initial_linear_sync retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_sync_linear_changes(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Incremental sync (fetches all and updates)."""
    return await _run_initial_linear_sync(user_id, integration_id, access_token)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def sync_linear_changes(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Incrementally sync Linear changes since last sync."""
    try:
        return run_async(
            _run_sync_linear_changes(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("sync_linear_changes retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)
