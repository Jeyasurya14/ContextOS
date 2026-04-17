# backend/app/integrations/notion.py

import asyncio
import base64
from urllib.parse import urlencode

import httpx
from loguru import logger

from app.core.config import settings


class NotionIntegration:
    """Notion OAuth and API integration client."""

    AUTH_URL = "https://api.notion.com/v1/oauth/authorize"
    TOKEN_URL = "https://api.notion.com/v1/oauth/token"
    API_BASE = "https://api.notion.com/v1"
    API_VERSION = "2022-06-28"

    def __init__(self) -> None:
        """Initialize Notion integration with configured credentials."""
        self.client_id = settings.NOTION_CLIENT_ID
        self.client_secret = settings.NOTION_CLIENT_SECRET

    @property
    def redirect_uri(self) -> str:
        """Resolved redirect URI, falling back to BACKEND_URL when env var unset."""
        return (
            settings.NOTION_REDIRECT_URI
            or f"{settings.BACKEND_URL}/api/v1/integrations/notion/callback"
        )

    def _headers(self, access_token: str) -> dict:
        """Build standard Notion API headers."""
        return {
            "Authorization": f"Bearer {access_token}",
            "Notion-Version": self.API_VERSION,
            "Content-Type": "application/json",
        }

    def get_oauth_url(self, user_id: str, state: str) -> str:
        """Generate the Notion OAuth authorization URL.

        Args:
            user_id: The user ID initiating the OAuth flow.
            state: A CSRF state token for the OAuth callback.

        Returns:
            The full Notion OAuth authorization URL.
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "owner": "user",
            "state": state,
        }
        url = f"{self.AUTH_URL}?{urlencode(params)}"
        logger.info("Generated Notion OAuth URL for user_id={}", user_id)
        return url

    async def exchange_code_for_token(self, code: str) -> dict:
        """Exchange an OAuth authorization code for an access token.

        Args:
            code: The authorization code from Notion callback.

        Returns:
            Dict containing access_token, workspace_id, workspace_name, etc.
        """
        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        redirect = self.redirect_uri

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect,
                },
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/json",
                    "Notion-Version": self.API_VERSION,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if "error" in data:
                logger.error("Notion token exchange failed: {}", data.get("error"))
                raise ValueError(f"Notion OAuth error: {data.get('error')}")

            logger.info("Notion token exchange successful, workspace={}", data.get("workspace_name"))
            return data

    async def get_all_pages(self, access_token: str) -> list:
        """Search for all pages the integration has access to, with pagination.

        Args:
            access_token: A valid Notion access token.

        Returns:
            List of page objects.
        """
        pages: list = []
        has_more = True
        start_cursor: str | None = None

        async with httpx.AsyncClient() as client:
            while has_more:
                body: dict = {
                    "filter": {"value": "page", "property": "object"},
                    "page_size": 100,
                }
                if start_cursor:
                    body["start_cursor"] = start_cursor

                await asyncio.sleep(1)
                response = await client.post(
                    f"{self.API_BASE}/search",
                    json=body,
                    headers=self._headers(access_token),
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                pages.extend(data.get("results", []))
                has_more = data.get("has_more", False)
                start_cursor = data.get("next_cursor")

        logger.info("Fetched {} Notion pages", len(pages))
        return pages

    async def get_page_content(self, access_token: str, page_id: str) -> str:
        """Recursively fetch all blocks from a Notion page and convert to text.

        Args:
            access_token: A valid Notion access token.
            page_id: The Notion page ID.

        Returns:
            A plain text representation of the page content.
        """
        blocks = await self._get_blocks_recursive(access_token, page_id)
        text_parts: list[str] = []

        for block in blocks:
            block_text = self._block_to_text(block)
            if block_text:
                text_parts.append(block_text)

        content = "\n".join(text_parts)
        logger.info("Extracted {} chars from page {}", len(content), page_id[:8])
        return content

    async def _get_blocks_recursive(
        self, access_token: str, block_id: str, depth: int = 0
    ) -> list:
        """Recursively fetch all child blocks.

        Args:
            access_token: A valid Notion access token.
            block_id: The parent block or page ID.
            depth: Current recursion depth (max 3).

        Returns:
            Flat list of block objects.
        """
        if depth > 3:
            return []

        blocks: list = []
        has_more = True
        start_cursor: str | None = None

        async with httpx.AsyncClient() as client:
            while has_more:
                params: dict = {"page_size": 100}
                if start_cursor:
                    params["start_cursor"] = start_cursor

                await asyncio.sleep(1)
                try:
                    response = await client.get(
                        f"{self.API_BASE}/blocks/{block_id}/children",
                        params=params,
                        headers=self._headers(access_token),
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                except httpx.HTTPStatusError as e:
                    logger.warning("Failed to fetch blocks for {}: {}", block_id[:8], e.response.status_code)
                    return blocks

                for block in data.get("results", []):
                    blocks.append(block)
                    if block.get("has_children", False):
                        children = await self._get_blocks_recursive(
                            access_token, block["id"], depth + 1
                        )
                        blocks.extend(children)

                has_more = data.get("has_more", False)
                start_cursor = data.get("next_cursor")

        return blocks

    @staticmethod
    def _extract_rich_text(rich_text_list: list) -> str:
        """Extract plain text from a Notion rich_text array."""
        parts = []
        for rt in rich_text_list:
            text = rt.get("plain_text", "") or rt.get("text", {}).get("content", "")
            if text:
                parts.append(text)
        return "".join(parts)

    def _block_to_text(self, block: dict) -> str:
        """Convert a single Notion block to plain text.

        Args:
            block: A Notion block API object.

        Returns:
            Plain text representation of the block.
        """
        block_type = block.get("type", "")
        block_data = block.get(block_type, {})

        if block_type in (
            "paragraph", "heading_1", "heading_2", "heading_3",
            "quote", "callout",
        ):
            text = self._extract_rich_text(block_data.get("rich_text", []))
            if block_type == "heading_1":
                return f"# {text}"
            if block_type == "heading_2":
                return f"## {text}"
            if block_type == "heading_3":
                return f"### {text}"
            if block_type == "quote":
                return f"> {text}"
            return text

        if block_type in ("bulleted_list_item", "numbered_list_item"):
            text = self._extract_rich_text(block_data.get("rich_text", []))
            return f"- {text}"

        if block_type == "to_do":
            text = self._extract_rich_text(block_data.get("rich_text", []))
            checked = block_data.get("checked", False)
            marker = "[x]" if checked else "[ ]"
            return f"{marker} {text}"

        if block_type == "toggle":
            text = self._extract_rich_text(block_data.get("rich_text", []))
            return f"▸ {text}"

        if block_type == "code":
            text = self._extract_rich_text(block_data.get("rich_text", []))
            language = block_data.get("language", "")
            return f"```{language}\n{text}\n```"

        if block_type == "equation":
            return block_data.get("expression", "")

        if block_type == "divider":
            return "---"

        if block_type == "table_row":
            cells = block_data.get("cells", [])
            row_texts = [self._extract_rich_text(cell) for cell in cells]
            return " | ".join(row_texts)

        if block_type in ("image", "video", "file", "pdf"):
            file_data = block_data.get("external", {}) or block_data.get("file", {})
            url = file_data.get("url", "")
            caption = self._extract_rich_text(block_data.get("caption", []))
            return f"[{block_type}: {caption or url}]"

        if block_type == "bookmark":
            url = block_data.get("url", "")
            caption = self._extract_rich_text(block_data.get("caption", []))
            return f"[Bookmark: {caption or url}]"

        if block_type == "embed":
            url = block_data.get("url", "")
            return f"[Embed: {url}]"

        if block_type == "child_page":
            return f"[Page: {block_data.get('title', 'Untitled')}]"

        if block_type == "child_database":
            return f"[Database: {block_data.get('title', 'Untitled')}]"

        return ""

    async def get_databases(self, access_token: str) -> list:
        """Search for all databases the integration has access to.

        Args:
            access_token: A valid Notion access token.

        Returns:
            List of database objects.
        """
        databases: list = []
        has_more = True
        start_cursor: str | None = None

        async with httpx.AsyncClient() as client:
            while has_more:
                body: dict = {
                    "filter": {"value": "database", "property": "object"},
                    "page_size": 100,
                }
                if start_cursor:
                    body["start_cursor"] = start_cursor

                await asyncio.sleep(1)
                response = await client.post(
                    f"{self.API_BASE}/search",
                    json=body,
                    headers=self._headers(access_token),
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                databases.extend(data.get("results", []))
                has_more = data.get("has_more", False)
                start_cursor = data.get("next_cursor")

        logger.info("Fetched {} Notion databases", len(databases))
        return databases

    async def get_database_entries(self, access_token: str, database_id: str) -> list:
        """Query all entries from a Notion database with pagination.

        Args:
            access_token: A valid Notion access token.
            database_id: The Notion database ID.

        Returns:
            List of page objects (database entries).
        """
        entries: list = []
        has_more = True
        start_cursor: str | None = None

        async with httpx.AsyncClient() as client:
            while has_more:
                body: dict = {"page_size": 100}
                if start_cursor:
                    body["start_cursor"] = start_cursor

                await asyncio.sleep(1)
                response = await client.post(
                    f"{self.API_BASE}/databases/{database_id}/query",
                    json=body,
                    headers=self._headers(access_token),
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                entries.extend(data.get("results", []))
                has_more = data.get("has_more", False)
                start_cursor = data.get("next_cursor")

        logger.info("Fetched {} entries from database {}", len(entries), database_id[:8])
        return entries

    @staticmethod
    def format_page_as_text(page_meta: dict, content: str) -> str:
        """Format a Notion page and its content into a text block.

        Args:
            page_meta: The Notion page metadata object.
            content: The plain text content of the page.

        Returns:
            Formatted string representing the page.
        """
        title_parts = []
        for prop in page_meta.get("properties", {}).values():
            if prop.get("type") == "title":
                for t in prop.get("title", []):
                    title_parts.append(t.get("plain_text", ""))
        title = "".join(title_parts) or "Untitled"

        page_id = page_meta.get("id", "unknown")
        url = page_meta.get("url", "")
        created = page_meta.get("created_time", "")
        updated = page_meta.get("last_edited_time", "")

        return (
            f"[Notion Page] {title}\n"
            f"ID: {page_id}\n"
            f"URL: {url}\n"
            f"Created: {created}\n"
            f"Updated: {updated}\n"
            f"---\n"
            f"{content}"
        )


notion_integration = NotionIntegration()
