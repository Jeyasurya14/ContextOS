# backend/app/workers/google_worker.py

import asyncio
from datetime import datetime, timezone

from loguru import logger
from sqlalchemy import select

from app.workers.celery_app import celery_app
from app.integrations.google_drive import google_drive_integration
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


async def _run_initial_google_sync(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of initial Google Drive sync."""
    total_chunks = 0

    try:
        files = await google_drive_integration.get_all_documents(access_token)
        logger.info("Fetched {} Google Drive files for user_id={}", len(files), user_id)

        async with async_session_factory() as db:
            for fileinfo in files:
                file_id = fileinfo.get("id", "")
                mime_type = fileinfo.get("mimeType", "")
                
                try:
                    title = fileinfo.get("name", "Untitled Document")
                    modified_time = fileinfo.get("modifiedTime", "")
                    web_view_link = fileinfo.get("webViewLink", "")
                    
                    content = await google_drive_integration.export_file_content(
                        access_token, file_id, mime_type
                    )

                    if not content or len(content.strip()) < 10:
                        continue
                        
                    # Prepend a readable title for contextual embedding
                    full_content = f"[Google Drive Document: {title}]\nLast Modified: {modified_time}\n\n{content}"

                    chunks = await context_processor.process_and_store(
                        content=full_content,
                        source_type="google_drive",
                        source_url=web_view_link,
                        user_id=user_id,
                        integration_id=integration_id,
                        metadata={
                            "file_id": file_id,
                            "mime_type": mime_type,
                            "updated_at": modified_time,
                        },
                        db=db,
                    )
                    total_chunks += chunks
                except Exception as e:
                    logger.error("Failed syncing Google Drive file {}: {}", file_id, type(e).__name__)

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
        logger.error("Initial Google Drive sync failed for user_id={}: {}", user_id, type(e).__name__)
        raise

    logger.info("Initial Google Drive sync complete: user_id={}, chunks={}", user_id, total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def initial_google_sync(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Run initial Google sync for a user."""
    try:
        return run_async(
            _run_initial_google_sync(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("initial_google_sync retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_sync_google_changes(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Incremental sync (fetches all and updates)."""
    return await _run_initial_google_sync(user_id, integration_id, access_token)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def sync_google_changes(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Incrementally sync Google changes since last sync."""
    try:
        return run_async(
            _run_sync_google_changes(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("sync_google_changes retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)
