# backend/app/integrations/slack.py

import asyncio
import hashlib
import hmac
import time
from urllib.parse import urlencode

import httpx
from loguru import logger

from app.core.config import settings


class SlackIntegration:
    """Slack OAuth and API integration client."""

    AUTH_URL = "https://slack.com/oauth/v2/authorize"
    TOKEN_URL = "https://slack.com/api/oauth.v2.access"
    API_BASE = "https://slack.com/api"
    SCOPES = "channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:history,users:read,team:read"

    def __init__(self) -> None:
        """Initialize Slack integration with configured credentials."""
        self.client_id = settings.SLACK_CLIENT_ID
        self.client_secret = settings.SLACK_CLIENT_SECRET
        self.signing_secret = settings.SLACK_SIGNING_SECRET

    @property
    def redirect_uri(self) -> str:
        """Resolved redirect URI, falling back to BACKEND_URL when env var unset."""
        return (
            settings.SLACK_REDIRECT_URI
            or f"{settings.BACKEND_URL}/api/v1/integrations/slack/callback"
        )

    def get_oauth_url(self, user_id: str, state: str) -> str:
        """Generate the Slack OAuth authorization URL.

        Args:
            user_id: The user ID initiating the OAuth flow.
            state: A CSRF state token for the OAuth callback.

        Returns:
            The full Slack OAuth authorization URL.
        """
        params = {
            "client_id": self.client_id,
            "scope": self.SCOPES,
            "redirect_uri": self.redirect_uri,
            "state": state,
        }
        url = f"{self.AUTH_URL}?{urlencode(params)}"
        logger.info("Generated Slack OAuth URL for user_id={}", user_id)
        return url

    async def exchange_code_for_token(self, code: str) -> dict:
        """Exchange an OAuth authorization code for an access token.

        Args:
            code: The authorization code from Slack callback.

        Returns:
            Dict containing access_token, team info, authed_user, etc.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("ok", False):
                error = data.get("error", "unknown_error")
                logger.error("Slack token exchange failed: {}", error)
                raise ValueError(f"Slack OAuth error: {error}")

            logger.info("Slack token exchange successful, team={}", data.get("team", {}).get("name"))
            return data

    async def get_workspace_info(self, access_token: str) -> dict:
        """Get Slack workspace/team info.

        Args:
            access_token: A valid Slack bot access token.

        Returns:
            Dict containing team info.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/team.info",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("ok", False):
                logger.error("Slack team.info failed: {}", data.get("error"))
                raise ValueError(f"Slack API error: {data.get('error')}")

            return data.get("team", {})

    async def get_channels(self, access_token: str) -> list:
        """Get channels where the bot is a member.

        Args:
            access_token: A valid Slack bot access token.

        Returns:
            List of channel dicts where is_member is True.
        """
        channels: list = []
        cursor: str | None = None

        async with httpx.AsyncClient() as client:
            while True:
                params: dict = {"types": "public_channel,private_channel", "limit": 200}
                if cursor:
                    params["cursor"] = cursor

                await asyncio.sleep(1)
                response = await client.get(
                    f"{self.API_BASE}/conversations.list",
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                if not data.get("ok", False):
                    logger.error("Slack conversations.list failed: {}", data.get("error"))
                    break

                for ch in data.get("channels", []):
                    if ch.get("is_member", False):
                        channels.append(ch)

                cursor = data.get("response_metadata", {}).get("next_cursor")
                if not cursor:
                    break

        logger.info("Fetched {} Slack channels (member)", len(channels))
        return channels

    async def get_channel_history(
        self,
        access_token: str,
        channel_id: str,
        oldest_timestamp: str | None = None,
        limit: int = 200,
    ) -> list:
        """Get channel message history with thread replies, resolving usernames.

        Skips bot messages and messages shorter than 10 characters.

        Args:
            access_token: A valid Slack bot access token.
            channel_id: The Slack channel ID.
            oldest_timestamp: Unix timestamp string to fetch messages since.
            limit: Maximum number of messages to fetch.

        Returns:
            List of enriched message dicts.
        """
        username_cache: dict[str, str] = {}
        messages: list = []

        async with httpx.AsyncClient() as client:
            params: dict = {"channel": channel_id, "limit": min(limit, 200)}
            if oldest_timestamp:
                params["oldest"] = oldest_timestamp

            await asyncio.sleep(1)
            response = await client.get(
                f"{self.API_BASE}/conversations.history",
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("ok", False):
                logger.error("Slack history failed for {}: {}", channel_id, data.get("error"))
                return messages

            for msg in data.get("messages", []):
                if msg.get("subtype") == "bot_message" or msg.get("bot_id"):
                    continue
                text = msg.get("text", "")
                if len(text) < 10:
                    continue

                user_id = msg.get("user", "")
                if user_id:
                    msg["username"] = await self.get_user_name(
                        access_token, user_id, username_cache, client
                    )

                if msg.get("thread_ts") and msg.get("thread_ts") == msg.get("ts"):
                    replies = await self._get_thread_replies(
                        access_token, channel_id, msg["thread_ts"],
                        username_cache, client,
                    )
                    msg["replies"] = replies

                messages.append(msg)

        logger.info("Fetched {} messages from channel {}", len(messages), channel_id)
        return messages

    async def _get_thread_replies(
        self,
        access_token: str,
        channel_id: str,
        thread_ts: str,
        username_cache: dict[str, str],
        client: httpx.AsyncClient,
    ) -> list:
        """Fetch thread replies for a parent message.

        Args:
            access_token: Slack bot token.
            channel_id: The channel containing the thread.
            thread_ts: The thread's parent timestamp.
            username_cache: Cache dict for username lookups.
            client: Reusable httpx client.

        Returns:
            List of reply message dicts.
        """
        await asyncio.sleep(1)
        response = await client.get(
            f"{self.API_BASE}/conversations.replies",
            params={"channel": channel_id, "ts": thread_ts, "limit": 50},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()

        if not data.get("ok", False):
            return []

        replies = []
        for msg in data.get("messages", [])[1:]:
            if msg.get("subtype") == "bot_message" or msg.get("bot_id"):
                continue
            text = msg.get("text", "")
            if len(text) < 10:
                continue

            user_id = msg.get("user", "")
            if user_id:
                msg["username"] = await self.get_user_name(
                    access_token, user_id, username_cache, client
                )
            replies.append(msg)

        return replies

    async def get_user_name(
        self,
        access_token: str,
        user_id: str,
        cache: dict[str, str],
        client: httpx.AsyncClient | None = None,
    ) -> str:
        """Resolve a Slack user ID to a display name, with caching.

        Args:
            access_token: Slack bot token.
            user_id: The Slack user ID to resolve.
            cache: Dict cache mapping user_id -> display_name.
            client: Optional reusable httpx client.

        Returns:
            The user's display name or real name.
        """
        if user_id in cache:
            return cache[user_id]

        try:
            should_close = False
            if client is None:
                client = httpx.AsyncClient()
                should_close = True

            await asyncio.sleep(1)
            response = await client.get(
                f"{self.API_BASE}/users.info",
                params={"user": user_id},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if should_close:
                await client.aclose()

            if data.get("ok", False):
                user = data.get("user", {})
                profile = user.get("profile", {})
                name = (
                    profile.get("display_name")
                    or profile.get("real_name")
                    or user.get("real_name")
                    or user.get("name")
                    or user_id
                )
                cache[user_id] = name
                return name
        except Exception as e:
            logger.warning("Failed to resolve Slack user {}: {}", user_id, type(e).__name__)

        cache[user_id] = user_id
        return user_id

    @staticmethod
    def verify_slack_signature(
        body: str, timestamp: str, signature: str, signing_secret: str
    ) -> bool:
        """Verify a Slack request signature using HMAC-SHA256.

        Args:
            body: The raw request body string.
            timestamp: The X-Slack-Request-Timestamp header value.
            signature: The X-Slack-Signature header value.
            signing_secret: The Slack app signing secret.

        Returns:
            True if the signature is valid.
        """
        try:
            request_time = int(timestamp)
        except (ValueError, TypeError):
            logger.warning("Invalid Slack timestamp format")
            return False

        if abs(time.time() - request_time) > 300:
            logger.warning("Slack request timestamp too old")
            return False

        sig_basestring = f"v0:{timestamp}:{body}"
        computed = "v0=" + hmac.new(
            signing_secret.encode("utf-8"),
            sig_basestring.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        is_valid = hmac.compare_digest(computed, signature)
        if not is_valid:
            logger.warning("Slack signature mismatch")
        return is_valid

    @staticmethod
    def format_messages_as_text(messages: list, channel_name: str) -> str:
        """Format a list of Slack messages into readable text.

        Args:
            messages: List of enriched Slack message dicts.
            channel_name: The channel name for context.

        Returns:
            Formatted string of all messages.
        """
        parts: list[str] = [f"[Slack #{channel_name}]"]

        for msg in messages:
            username = msg.get("username", msg.get("user", "Unknown"))
            text = msg.get("text", "")
            ts = msg.get("ts", "")

            try:
                ts_float = float(ts)
                from datetime import datetime, timezone
                dt = datetime.fromtimestamp(ts_float, tz=timezone.utc)
                time_str = dt.strftime("%Y-%m-%d %H:%M UTC")
            except (ValueError, TypeError, OSError):
                time_str = ts

            parts.append(f"[{time_str}] {username}: {text}")

            for reply in msg.get("replies", []):
                reply_user = reply.get("username", reply.get("user", "Unknown"))
                reply_text = reply.get("text", "")
                parts.append(f"  ↳ {reply_user}: {reply_text}")

        return "\n".join(parts)


slack_integration = SlackIntegration()
