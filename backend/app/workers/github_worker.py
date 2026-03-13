# backend/app/workers/github_worker.py

import asyncio
from datetime import datetime, timedelta, timezone

from loguru import logger

from app.workers.celery_app import celery_app
from app.integrations.github import github_integration
from app.core.database import async_session_factory


def run_async(coro):
    """Helper to run async coroutines in sync Celery workers."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _run_initial_github_sync(
    user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of initial GitHub sync.

    Fetches up to 20 repos, last 30 days of commits, open PRs, and open issues.

    Args:
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted GitHub access token.

    Returns:
        Total number of chunks stored.
    """
    from app.services.context_processor import context_processor

    total_chunks = 0
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    try:
        repos = await github_integration.get_repos(access_token)
        repos = repos[:20]
        logger.info("Syncing {} repos for user_id={}", len(repos), user_id)

        async with async_session_factory() as db:
            for repo in repos:
                repo_name = repo.get("full_name", "")
                logger.info("Syncing repo: {}", repo_name)

                try:
                    commits = await github_integration.get_commits(
                        access_token, repo_name, since=since
                    )
                    for commit in commits:
                        text = github_integration.format_commit_as_text(commit, repo_name)
                        if text:
                            chunks = await context_processor.process_and_store(
                                content=text,
                                source_type="github_commit",
                                source_url=commit.get("html_url", ""),
                                user_id=user_id,
                                integration_id=integration_id,
                                metadata={
                                    "repo": repo_name,
                                    "sha": commit.get("sha", "")[:7],
                                },
                                db=db,
                            )
                            total_chunks += chunks
                except Exception as e:
                    logger.error("Failed syncing commits for {}: {}", repo_name, type(e).__name__)

                try:
                    prs = await github_integration.get_pull_requests(
                        access_token, repo_name, state="open"
                    )
                    for pr in prs:
                        pr_text = (
                            f"[{repo_name}] PR #{pr.get('number')}: {pr.get('title', '')}\n"
                            f"Author: {pr.get('user', {}).get('login', 'Unknown')}\n"
                            f"State: {pr.get('state', '')}\n"
                            f"Body: {pr.get('body', '') or 'No description'}\n"
                            f"URL: {pr.get('html_url', '')}"
                        )
                        chunks = await context_processor.process_and_store(
                            content=pr_text,
                            source_type="github_pr",
                            source_url=pr.get("html_url", ""),
                            user_id=user_id,
                            integration_id=integration_id,
                            metadata={
                                "repo": repo_name,
                                "pr_number": pr.get("number"),
                            },
                            db=db,
                        )
                        total_chunks += chunks
                except Exception as e:
                    logger.error("Failed syncing PRs for {}: {}", repo_name, type(e).__name__)

                try:
                    issues = await github_integration.get_issues(
                        access_token, repo_name, state="open"
                    )
                    for issue in issues:
                        issue_text = (
                            f"[{repo_name}] Issue #{issue.get('number')}: {issue.get('title', '')}\n"
                            f"Author: {issue.get('user', {}).get('login', 'Unknown')}\n"
                            f"State: {issue.get('state', '')}\n"
                            f"Labels: {', '.join(l.get('name', '') for l in issue.get('labels', []))}\n"
                            f"Body: {issue.get('body', '') or 'No description'}\n"
                            f"URL: {issue.get('html_url', '')}"
                        )
                        chunks = await context_processor.process_and_store(
                            content=issue_text,
                            source_type="github_issue",
                            source_url=issue.get("html_url", ""),
                            user_id=user_id,
                            integration_id=integration_id,
                            metadata={
                                "repo": repo_name,
                                "issue_number": issue.get("number"),
                            },
                            db=db,
                        )
                        total_chunks += chunks
                except Exception as e:
                    logger.error("Failed syncing issues for {}: {}", repo_name, type(e).__name__)

            await db.commit()

    except Exception as e:
        logger.error("Initial GitHub sync failed for user_id={}: {}", user_id, type(e).__name__)
        raise

    logger.info("Initial GitHub sync complete: user_id={}, chunks={}", user_id, total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def initial_github_sync(
    self, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Run initial GitHub sync for a user.

    Args:
        self: Celery task instance.
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted GitHub access token.

    Returns:
        Total number of chunks stored.
    """
    try:
        return run_async(
            _run_initial_github_sync(user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("initial_github_sync retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_process_push_event(
    payload: dict, user_id: str, integration_id: str, access_token: str
) -> int:
    """Async implementation of push event processing.

    Args:
        payload: The GitHub push webhook payload.
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted GitHub access token.

    Returns:
        Number of chunks stored.
    """
    from app.services.context_processor import context_processor

    total_chunks = 0
    repo_name = payload.get("repository", {}).get("full_name", "")
    commits = payload.get("commits", [])

    async with async_session_factory() as db:
        for commit_data in commits:
            sha = commit_data.get("id", "")
            try:
                detailed = await github_integration.get_commits(access_token, repo_name)
                commit_detail = next(
                    (c for c in detailed if c.get("sha") == sha), commit_data
                )
                text = github_integration.format_commit_as_text(commit_detail, repo_name)
                if text:
                    chunks = await context_processor.process_and_store(
                        content=text,
                        source_type="github_commit",
                        source_url=commit_data.get("url", ""),
                        user_id=user_id,
                        integration_id=integration_id,
                        metadata={"repo": repo_name, "sha": sha[:7]},
                        db=db,
                    )
                    total_chunks += chunks
            except Exception as e:
                logger.error("Failed processing push commit {}: {}", sha[:7], type(e).__name__)

        await db.commit()

    logger.info("Processed push event: repo={}, commits={}, chunks={}", repo_name, len(commits), total_chunks)
    return total_chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_push_event(
    self, payload: dict, user_id: str, integration_id: str, access_token: str
) -> int:
    """Celery task: Process a GitHub push webhook event.

    Args:
        self: Celery task instance.
        payload: The push event webhook payload.
        user_id: The user's ID.
        integration_id: The integration record ID.
        access_token: Decrypted GitHub access token.

    Returns:
        Number of chunks stored.
    """
    try:
        return run_async(
            _run_process_push_event(payload, user_id, integration_id, access_token)
        )
    except Exception as exc:
        logger.error("process_push_event retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_process_pr_event(
    payload: dict, user_id: str, integration_id: str
) -> int:
    """Async implementation of PR event processing.

    Args:
        payload: The GitHub pull_request webhook payload.
        user_id: The user's ID.
        integration_id: The integration record ID.

    Returns:
        Number of chunks stored.
    """
    from app.services.context_processor import context_processor

    pr = payload.get("pull_request", {})
    repo_name = payload.get("repository", {}).get("full_name", "")
    action = payload.get("action", "")

    pr_text = (
        f"[{repo_name}] PR #{pr.get('number')} {action}: {pr.get('title', '')}\n"
        f"Author: {pr.get('user', {}).get('login', 'Unknown')}\n"
        f"State: {pr.get('state', '')}\n"
        f"Merged: {pr.get('merged', False)}\n"
        f"Body: {pr.get('body', '') or 'No description'}\n"
        f"URL: {pr.get('html_url', '')}"
    )

    async with async_session_factory() as db:
        chunks = await context_processor.process_and_store(
            content=pr_text,
            source_type="github_pr",
            source_url=pr.get("html_url", ""),
            user_id=user_id,
            integration_id=integration_id,
            metadata={"repo": repo_name, "pr_number": pr.get("number"), "action": action},
            db=db,
        )
        await db.commit()

    logger.info("Processed PR event: repo={}, pr=#{}, chunks={}", repo_name, pr.get("number"), chunks)
    return chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_pr_event(self, payload: dict, user_id: str, integration_id: str) -> int:
    """Celery task: Process a GitHub pull_request webhook event.

    Args:
        self: Celery task instance.
        payload: The pull_request event webhook payload.
        user_id: The user's ID.
        integration_id: The integration record ID.

    Returns:
        Number of chunks stored.
    """
    try:
        return run_async(
            _run_process_pr_event(payload, user_id, integration_id)
        )
    except Exception as exc:
        logger.error("process_pr_event retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)


async def _run_process_issue_event(
    payload: dict, user_id: str, integration_id: str
) -> int:
    """Async implementation of issue event processing.

    Args:
        payload: The GitHub issues webhook payload.
        user_id: The user's ID.
        integration_id: The integration record ID.

    Returns:
        Number of chunks stored.
    """
    from app.services.context_processor import context_processor

    issue = payload.get("issue", {})
    repo_name = payload.get("repository", {}).get("full_name", "")
    action = payload.get("action", "")

    issue_text = (
        f"[{repo_name}] Issue #{issue.get('number')} {action}: {issue.get('title', '')}\n"
        f"Author: {issue.get('user', {}).get('login', 'Unknown')}\n"
        f"State: {issue.get('state', '')}\n"
        f"Labels: {', '.join(l.get('name', '') for l in issue.get('labels', []))}\n"
        f"Body: {issue.get('body', '') or 'No description'}\n"
        f"URL: {issue.get('html_url', '')}"
    )

    async with async_session_factory() as db:
        chunks = await context_processor.process_and_store(
            content=issue_text,
            source_type="github_issue",
            source_url=issue.get("html_url", ""),
            user_id=user_id,
            integration_id=integration_id,
            metadata={"repo": repo_name, "issue_number": issue.get("number"), "action": action},
            db=db,
        )
        await db.commit()

    logger.info("Processed issue event: repo={}, issue=#{}, chunks={}", repo_name, issue.get("number"), chunks)
    return chunks


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_issue_event(self, payload: dict, user_id: str, integration_id: str) -> int:
    """Celery task: Process a GitHub issues webhook event.

    Args:
        self: Celery task instance.
        payload: The issues event webhook payload.
        user_id: The user's ID.
        integration_id: The integration record ID.

    Returns:
        Number of chunks stored.
    """
    try:
        return run_async(
            _run_process_issue_event(payload, user_id, integration_id)
        )
    except Exception as exc:
        logger.error("process_issue_event retry {}/{}: {}", self.request.retries, self.max_retries, exc)
        raise self.retry(exc=exc)
