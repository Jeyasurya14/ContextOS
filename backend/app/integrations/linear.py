# backend/app/integrations/linear.py

import asyncio
from urllib.parse import urlencode

import httpx
from loguru import logger

from app.core.config import settings


class LinearIntegration:
    """Linear OAuth and GraphQL API integration client."""

    AUTH_URL = "https://linear.app/oauth/authorize"
    TOKEN_URL = "https://api.linear.app/oauth/token"
    GRAPHQL_URL = "https://api.linear.app/graphql"

    def __init__(self) -> None:
        """Initialize Linear integration with configured credentials."""
        self.client_id = settings.LINEAR_CLIENT_ID
        self.client_secret = settings.LINEAR_CLIENT_SECRET

    @property
    def redirect_uri(self) -> str:
        """Resolved redirect URI, falling back to BACKEND_URL when env var unset."""
        return (
            settings.LINEAR_REDIRECT_URI
            or f"{settings.BACKEND_URL}/api/v1/integrations/linear/callback"
        )

    def _headers(self, access_token: str) -> dict:
        """Build standard Linear API headers."""
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    def get_oauth_url(self, user_id: str, state: str) -> str:
        """Generate the Linear OAuth authorization URL.

        Args:
            user_id: The user ID initiating the OAuth flow.
            state: A CSRF state token for the OAuth callback.

        Returns:
            The full Linear OAuth authorization URL.
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "state": state,
            "scope": "read",
            "prompt": "consent",
        }
        url = f"{self.AUTH_URL}?{urlencode(params)}"
        logger.info("Generated Linear OAuth URL for user_id={}", user_id)
        return url

    async def exchange_code_for_token(self, code: str) -> dict:
        """Exchange an OAuth authorization code for an access token.

        Args:
            code: The authorization code from Linear callback.

        Returns:
            Dict containing access_token and other details.
        """
        redirect = self.redirect_uri

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if "error" in data:
                logger.error("Linear token exchange failed: {}", data.get("error"))
                raise ValueError(f"Linear OAuth error: {data.get('error')}")

            logger.info("Linear token exchange successful")
            return data

    async def get_organization(self, access_token: str) -> dict:
        """Fetch the organization details using GraphQL."""
        query = """
        query {
          organization {
            id
            name
            urlKey
          }
        }
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.GRAPHQL_URL,
                json={"query": query},
                headers=self._headers(access_token),
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", {}).get("organization", {})

    async def get_issues(self, access_token: str) -> list:
        """Fetch all issues using GraphQL pagination."""
        issues = []
        has_next_page = True
        end_cursor = None

        query = """
        query($after: String) {
          issues(first: 50, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              description
              url
              createdAt
              updatedAt
              state {
                name
              }
              assignee {
                name
              }
              team {
                name
              }
            }
          }
        }
        """

        async with httpx.AsyncClient() as client:
            while has_next_page:
                variables = {"after": end_cursor} if end_cursor else {}
                await asyncio.sleep(0.5)  # Rate limiting
                
                response = await client.post(
                    self.GRAPHQL_URL,
                    json={"query": query, "variables": variables},
                    headers=self._headers(access_token),
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                issues_data = data.get("data", {}).get("issues", {})
                issues.extend(issues_data.get("nodes", []))
                
                page_info = issues_data.get("pageInfo", {})
                has_next_page = page_info.get("hasNextPage", False)
                end_cursor = page_info.get("endCursor")

        logger.info("Fetched {} Linear issues", len(issues))
        return issues


linear_integration = LinearIntegration()
