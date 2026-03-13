# backend/app/workers/slack_worker.py

import asyncio
from datetime import datetime, timedelta, timezone

from loguru import logger

from app.workers.celery_app import celery_app
from app.integrations.slack import slack_integration
from app.core.database import async_session_factory


def run_async(coro):
    """Helper to run async coroutines in sync Celery workers."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _run_initial_slack_sync(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of initial Slack sync.

    Fetches last 30 days of messages from up to 20 channels and 10 DMs.

    Args:
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Slack bot access token.

    Returns:
        Total number of chunks stored.
    """
    from app.services.context_processor import context_processor

    total_chunks = 0
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).timestamp()
    oldest_ts = str(thirty_days_ago)

    try:
        channels = await slack_integration.get_channels(access_token)
        channels = channels[:20]
        logger.info("Syncing {} Slack channels for user_id={}", len(channels), user_id)

        async with async_session_factory() as db:
            for channel in channels:
                channel_id = channel.get("id", "")
                channel_name = channel.get("name", "unknown")

                try:
                    messages = await slack_integration.get_channel_history(
                        access_token, channel_id, oldest_timestamp=oldest_ts, limit=200
                    )
                    if not messages:
                        continue

                    text = slack_integration.format_messages_as_text(messages, channel_name)
                    if len(text.strip()) < 20:
                        continue

                    chunks = await context_processor.process_and_store(
                        content=text,
                        source_type="slack_channel",
                        source_url=f"slack://channel/{channel_id}",
                        user_id=user_id,
                        integration_id=integration_id,
                        metadata={
                            "channel_id": channel_id,
                            "channel_name": channel_name,
                            "message_count": len(messages),
                        },
                        db=db,
                    )
                    total_chunks += chunks
                except Exception as e:
                    logger.error(
                        "Failed syncing Slack channel {}: {}",
                        channel_name, type(e).__name__,
                    )

            await db.commit()

    except Exception as e:
        logger.error("Initial Slack sync failed for user_id={}: {}", user_id, type(e).__name__)
        raise

    logger.info("Initial Slack sync complete: user_id={}, chunks={}", user_id, total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def initial_slack_sync(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Run initial Slack sync for a user.

    Args:
        self: Celery task instance.
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Slack bot access token.

    Returns:
        Total number of chunks stored.
    """
    try:
        return run_async(
            _run_initial_slack_sync(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("initial_slack_sync retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_process_slack_message(
    message_data: dict, user_id: str, integration_id: str
) -> int:
    """Async implementation of single Slack message processing.

    Skips messages shorter than 20 characters.

    Args:
        message_data: The Slack event message data.
        user_id: The user's ID.
        integration_id: The integration record ID.

    Returns:
        Number of chunks stored.
    """
    from app.services.context_processor import context_processor

    text = message_data.get("text", "")
    if len(text) < 20:
        logger.debug("Skipping short Slack message (<20 chars)")
        return 0

    channel_id = message_data.get("channel", "")
    username = message_data.get("username", message_data.get("user", "Unknown"))
    ts = message_data.get("ts", "")

    try:
        ts_float = float(ts)
        dt = datetime.fromtimestamp(ts_float, tz=timezone.utc)
        time_str = dt.strftime("%Y-%m-%d %H:%M UTC")
    except (ValueError, TypeError, OSError):
        time_str = ts

    formatted = f"[Slack message in {channel_id}]\n[{time_str}] {username}: {text}"

    async with async_session_factory() as db:
        chunks = await context_processor.process_and_store(
            content=formatted,
            source_type="slack_message",
            source_url=f"slack://channel/{channel_id}/message/{ts}",
            user_id=user_id,
            integration_id=integration_id,
            metadata={
                "channel_id": channel_id,
                "message_ts": ts,
            },
            db=db,
        )
        await db.commit()

    logger.info("Processed Slack message: channel={}, chunks={}", channel_id, chunks)
    return chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_slack_message(
    self, message_data: dict, user_id: str, integration_id: str
) -> int:
    """Celery task: Process a single real-time Slack message.

    Args:
        self: Celery task instance.
        message_data: The Slack event message data.
        user_id: The user's ID.
        integration_id: The integration record ID.

    Returns:
        Number of chunks stored.
    """
    try:
        return run_async(
            _run_process_slack_message(message_data, user_id, integration_id)
        )
    except Exception as exc:
        logger.error("process_slack_message retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_sync_slack_changes(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of incremental Slack sync.

    Fetches new messages since last_synced timestamp.

    Args:
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Slack bot access token.

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

            oldest_ts = None
            if integration.last_synced_at:
                oldest_ts = str(integration.last_synced_at.timestamp())

            channels = await slack_integration.get_channels(access_token)
            channels = channels[:20]

            for channel in channels:
                channel_id = channel.get("id", "")
                channel_name = channel.get("name", "unknown")

                try:
                    messages = await slack_integration.get_channel_history(
                        access_token, channel_id, oldest_timestamp=oldest_ts, limit=200
                    )
                    if not messages:
                        continue

                    text = slack_integration.format_messages_as_text(messages, channel_name)
                    if len(text.strip()) < 20:
                        continue

                    chunks = await context_processor.process_and_store(
                        content=text,
                        source_type="slack_channel",
                        source_url=f"slack://channel/{channel_id}",
                        user_id=user_id,
                        integration_id=integration_id,
                        metadata={
                            "channel_id": channel_id,
                            "channel_name": channel_name,
                            "message_count": len(messages),
                        },
                        db=db,
                    )
                    total_chunks += chunks
                except Exception as e:
                    logger.error(
                        "Failed syncing Slack channel {}: {}",
                        channel_name, type(e).__name__,
                    )

            integration.last_synced_at = datetime.now(timezone.utc)
            integration.total_chunks = (integration.total_chunks or 0) + total_chunks
            await db.commit()

    except Exception as e:
        logger.error("Slack incremental sync failed for user_id={}: {}", user_id, type(e).__name__)
        raise

    logger.info("Slack incremental sync complete: user_id={}, new_chunks={}", user_id, total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def sync_slack_changes(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Incrementally sync Slack changes since last sync.

    Args:
        self: Celery task instance.
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted Slack bot access token.

    Returns:
        Total number of new chunks stored.
    """
    try:
        return run_async(
            _run_sync_slack_changes(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("sync_slack_changes retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)
