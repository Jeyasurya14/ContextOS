# backend/app/workers/notion_worker.py

import asyncio
from datetime import datetime, timezone

from loguru import logger

from app.workers.celery_app import celery_app
from app.integrations.notion import notion_integration
from app.core.database import async_session_factory


def run_async(coro):
    """Helper to run async coroutines in sync Celery workers."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _run_initial_notion_sync(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of initial Notion sync.

    Fetches all pages and databases, converts content to text, and stores as chunks.

    Args:
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Notion access token.

    Returns:
        Total number of chunks stored.
    """
    from app.services.context_processor import context_processor

    total_chunks = 0

    try:
        pages = await notion_integration.get_all_pages(access_token)
        logger.info("Fetched {} Notion pages for user_id={}", len(pages), user_id)

        async with async_session_factory() as db:
            for page in pages:
                page_id = page.get("id", "")
                try:
                    content = await notion_integration.get_page_content(access_token, page_id)
                    if not content or len(content.strip()) < 20:
                        continue

                    text = notion_integration.format_page_as_text(page, content)
                    chunks = await context_processor.process_and_store(
                        content=text,
                        source_type="notion",
                        source_url=page.get("url", ""),
                        user_id=user_id,
                        integration_id=integration_id,
                        metadata={
                            "page_id": page_id,
                            "last_edited": page.get("last_edited_time", ""),
                        },
                        db=db,
                    )
                    total_chunks += chunks
                except Exception as e:
                    logger.error("Failed syncing Notion page {}: {}", page_id[:8], type(e).__name__)

            databases = await notion_integration.get_databases(access_token)
            logger.info("Fetched {} Notion databases for user_id={}", len(databases), user_id)

            for database in databases:
                db_id = database.get("id", "")
                try:
                    entries = await notion_integration.get_database_entries(access_token, db_id)
                    for entry in entries:
                        entry_id = entry.get("id", "")
                        try:
                            entry_content = await notion_integration.get_page_content(
                                access_token, entry_id
                            )
                            if not entry_content or len(entry_content.strip()) < 20:
                                continue

                            entry_text = notion_integration.format_page_as_text(entry, entry_content)
                            chunks = await context_processor.process_and_store(
                                content=entry_text,
                                source_type="notion",
                                source_url=entry.get("url", ""),
                                user_id=user_id,
                                integration_id=integration_id,
                                metadata={
                                    "page_id": entry_id,
                                    "database_id": db_id,
                                    "last_edited": entry.get("last_edited_time", ""),
                                },
                                db=db,
                            )
                            total_chunks += chunks
                        except Exception as e:
                            logger.error("Failed syncing db entry {}: {}", entry_id[:8], type(e).__name__)
                except Exception as e:
                    logger.error("Failed syncing Notion database {}: {}", db_id[:8], type(e).__name__)

            await db.commit()

    except Exception as e:
        logger.error("Initial Notion sync failed for user_id={}: {}", user_id, type(e).__name__)
        raise

    logger.info("Initial Notion sync complete: user_id={}, chunks={}", user_id, total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def initial_notion_sync(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Run initial Notion sync for a user.

    Args:
        self: Celery task instance.
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Notion access token.

    Returns:
        Total number of chunks stored.
    """
    try:
        return run_async(
            _run_initial_notion_sync(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("initial_notion_sync retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_sync_notion_changes(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of incremental Notion sync.

    Only syncs pages modified since last_synced timestamp.

    Args:
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Notion access token.

    Returns:
        Total number of new chunks stored.
    """
    from app.services.context_processor import context_processor
    from app.models.integration import Integration
    from sqlalchemy import select

    total_chunks = 0

    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(Integration).where(
                    Integration.id == integration_id,
                    Integration.user_id == user_id,
                )
            )
            integration = result.scalar_one_or_none()
            if integration is None:
                logger.warning("Integration {} not found for user_id={}", integration_id, user_id)
                return 0

            last_synced = integration.last_synced_at

            pages = await notion_integration.get_all_pages(access_token)

            for page in pages:
                page_id = page.get("id", "")
                last_edited = page.get("last_edited_time", "")

                if last_synced and last_edited:
                    try:
                        edited_dt = datetime.fromisoformat(last_edited.replace("Z", "+00:00"))
                        if edited_dt <= last_synced:
                            continue
                    except (ValueError, TypeError):
                        pass

                try:
                    content = await notion_integration.get_page_content(access_token, page_id)
                    if not content or len(content.strip()) < 20:
                        continue

                    text = notion_integration.format_page_as_text(page, content)
                    chunks = await context_processor.process_and_store(
                        content=text,
                        source_type="notion",
                        source_url=page.get("url", ""),
                        user_id=user_id,
                        integration_id=integration_id,
                        metadata={
                            "page_id": page_id,
                            "last_edited": last_edited,
                        },
                        db=db,
                    )
                    total_chunks += chunks
                except Exception as e:
                    logger.error("Failed syncing Notion page {}: {}", page_id[:8], type(e).__name__)

            integration.last_synced_at = datetime.now(timezone.utc)
            integration.total_chunks = (integration.total_chunks or 0) + total_chunks
            await db.commit()

    except Exception as e:
        logger.error("Notion incremental sync failed for user_id={}: {}", user_id, type(e).__name__)
        raise

    logger.info("Notion incremental sync complete: user_id={}, new_chunks={}", user_id, total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def sync_notion_changes(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Incrementally sync Notion changes since last sync.

    Args:
        self: Celery task instance.
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Notion access token.

    Returns:
        Total number of new chunks stored.
    """
    try:
        return run_async(
            _run_sync_notion_changes(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("sync_notion_changes retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)
