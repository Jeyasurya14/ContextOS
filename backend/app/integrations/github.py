# backend/app/integrations/github.py

import asyncio
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from loguru import logger

from app.core.config import settings


class GitHubIntegration:
    """GitHub OAuth and API integration client."""

    AUTH_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    API_BASE = "https://api.github.com"
    SCOPES = "repo read:user read:org"

    def __init__(self) -> None:
        """Initialize GitHub integration with configured credentials."""
        self.client_id = settings.GITHUB_CLIENT_ID
        self.client_secret = settings.GITHUB_CLIENT_SECRET

    def get_oauth_url(self, user_id: str, state: str) -> str:
        """Generate the GitHub OAuth authorization URL.

        Args:
            user_id: The user ID initiating the OAuth flow.
            state: A CSRF state token for the OAuth callback.

        Returns:
            The full GitHub OAuth authorization URL.
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": self.SCOPES,
            "state": state,
        }
        url = f"{self.AUTH_URL}?{urlencode(params)}"
        logger.info("Generated GitHub OAuth URL for user_id={}", user_id)
        return url

    async def exchange_code_for_token(self, code: str) -> dict:
        """Exchange an OAuth authorization code for an access token.

        Args:
            code: The authorization code from GitHub callback.

        Returns:
            Dict containing access_token, token_type, and scope.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if "error" in data:
                logger.error("GitHub token exchange failed: {}", data.get("error_description", data["error"]))
                raise ValueError(f"GitHub OAuth error: {data.get('error_description', data['error'])}")

            logger.info("GitHub token exchange successful")
            return data

    async def get_user_info(self, access_token: str) -> dict:
        """Get the authenticated GitHub user's profile.

        Args:
            access_token: A valid GitHub access token.

        Returns:
            Dict containing user profile data (id, login, name, email, avatar_url).
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            logger.info("Fetched GitHub user info: login={}", data.get("login"))
            return data

    async def get_repos(self, access_token: str) -> list:
        """Get the authenticated user's repositories sorted by last updated.

        Args:
            access_token: A valid GitHub access token.

        Returns:
            List of repository dicts.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/user/repos",
                params={"sort": "updated", "per_page": 50, "type": "all"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            repos = response.json()
            logger.info("Fetched {} GitHub repos", len(repos))
            return repos

    async def get_commits(
        self, access_token: str, repo_full_name: str, since: str | None = None
    ) -> list:
        """Get commits for a repository with full diff details.

        Args:
            access_token: A valid GitHub access token.
            repo_full_name: Full repository name (owner/repo).
            since: ISO 8601 timestamp to fetch commits since.

        Returns:
            List of commit dicts with full diff information.
        """
        params: dict = {"per_page": 30}
        if since:
            params["since"] = since

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/repos/{repo_full_name}/commits",
                params=params,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            commits_list = response.json()

            detailed_commits = []
            for commit_summary in commits_list:
                sha = commit_summary.get("sha", "")
                await asyncio.sleep(0.2)  # Reduced delay to speed up sync
                try:
                    detail_resp = await client.get(
                        f"{self.API_BASE}/repos/{repo_full_name}/commits/{sha}",
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Accept": "application/vnd.github+json",
                        },
                        timeout=30.0,
                    )
                    detail_resp.raise_for_status()
                    detailed_commits.append(detail_resp.json())
                except httpx.HTTPStatusError as e:
                    logger.warning(
                        "Failed to fetch commit detail {}/{}: {}",
                        repo_full_name, sha[:7], e.response.status_code,
                    )
                    detailed_commits.append(commit_summary)

            logger.info("Fetched {} commits for {}", len(detailed_commits), repo_full_name)
            return detailed_commits

    async def get_pull_requests(
        self, access_token: str, repo_full_name: str, state: str = "open"
    ) -> list:
        """Get pull requests for a repository.

        Args:
            access_token: A valid GitHub access token.
            repo_full_name: Full repository name (owner/repo).
            state: PR state filter (open, closed, all).

        Returns:
            List of pull request dicts.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/repos/{repo_full_name}/pulls",
                params={"state": state, "per_page": 30, "sort": "updated"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            prs = response.json()
            logger.info("Fetched {} PRs ({}) for {}", len(prs), state, repo_full_name)
            return prs

    async def get_issues(
        self, access_token: str, repo_full_name: str, state: str = "open"
    ) -> list:
        """Get issues for a repository, excluding pull requests.

        Args:
            access_token: A valid GitHub access token.
            repo_full_name: Full repository name (owner/repo).
            state: Issue state filter (open, closed, all).

        Returns:
            List of issue dicts (PRs excluded).
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/repos/{repo_full_name}/issues",
                params={"state": state, "per_page": 30, "sort": "updated"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            all_issues = response.json()
            issues = [i for i in all_issues if "pull_request" not in i]
            logger.info("Fetched {} issues ({}) for {}", len(issues), state, repo_full_name)
            return issues

    @staticmethod
    def verify_webhook_signature(
        body_bytes: bytes, signature_header: str, secret: str
    ) -> bool:
        """Verify a GitHub webhook HMAC-SHA256 signature.

        Args:
            body_bytes: The raw request body bytes.
            signature_header: The X-Hub-Signature-256 header value.
            secret: The webhook secret.

        Returns:
            True if the signature is valid.
        """
        if not signature_header or not signature_header.startswith("sha256="):
            logger.warning("Invalid GitHub webhook signature format")
            return False

        expected_sig = hmac.new(
            secret.encode("utf-8"), body_bytes, hashlib.sha256
        ).hexdigest()
        received_sig = signature_header[7:]
        is_valid = hmac.compare_digest(expected_sig, received_sig)

        if not is_valid:
            logger.warning("GitHub webhook signature mismatch")
        return is_valid

    async def setup_webhook(
        self, access_token: str, repo_full_name: str, webhook_url: str, secret: str
    ) -> dict:
        """Create a webhook on a GitHub repository.

        Args:
            access_token: A valid GitHub access token.
            repo_full_name: Full repository name (owner/repo).
            webhook_url: The URL GitHub should POST events to.
            secret: The secret for webhook signature verification.

        Returns:
            Dict containing the created webhook details.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE}/repos/{repo_full_name}/hooks",
                json={
                    "name": "web",
                    "active": True,
                    "events": ["push", "pull_request", "issues"],
                    "config": {
                        "url": webhook_url,
                        "content_type": "json",
                        "secret": secret,
                        "insecure_ssl": "0",
                    },
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            hook = response.json()
            logger.info("Webhook created for {}: hook_id={}", repo_full_name, hook.get("id"))
            return hook

    @staticmethod
    def format_commit_as_text(commit: dict, repo_name: str) -> str:
        """Format a commit dict into a human-readable text block.

        Args:
            commit: A GitHub commit API response dict.
            repo_name: The repository full name.

        Returns:
            Formatted string representing the commit.
        """
        commit_data = commit.get("commit", {})
        sha = commit.get("sha", "unknown")[:7]
        message = commit_data.get("message", "No message")
        author_name = commit_data.get("author", {}).get("name", "Unknown")
        author_date = commit_data.get("author", {}).get("date", "")

        files_changed = []
        for f in commit.get("files", []):
            filename = f.get("filename", "")
            status = f.get("status", "")
            additions = f.get("additions", 0)
            deletions = f.get("deletions", 0)
            patch = f.get("patch", "")
            patch_preview = patch[:500] if patch else ""
            files_changed.append(
                f"  {status}: {filename} (+{additions} -{deletions})\n{patch_preview}"
            )

        files_text = "\n".join(files_changed) if files_changed else "  No file details"
        stats = commit.get("stats", {})
        total = stats.get("total", 0)
        additions = stats.get("additions", 0)
        deletions = stats.get("deletions", 0)

        return (
            f"[{repo_name}] Commit {sha}\n"
            f"Author: {author_name}\n"
            f"Date: {author_date}\n"
            f"Message: {message}\n"
            f"Stats: {total} changes (+{additions} -{deletions})\n"
            f"Files:\n{files_text}"
        )


github_integration = GitHubIntegration()
