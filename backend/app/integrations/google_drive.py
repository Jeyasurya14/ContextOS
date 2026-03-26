# backend/app/integrations/google_drive.py

import io
from urllib.parse import urlencode

import httpx
from loguru import logger

from app.core.config import settings


class GoogleDriveIntegration:
    """Google Drive OAuth and API integration client."""

    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    # Scopes for Google Drive (read-only) and User Info
    SCOPES = " ".join([
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email"
    ])

    def __init__(self) -> None:
        """Initialize Google Drive integration with configured credentials."""
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    def get_oauth_url(self, user_id: str, state: str) -> str:
        """Generate the Google OAuth authorization URL.

        Args:
            user_id: The user ID initiating the OAuth flow.
            state: A CSRF state token for the OAuth callback.

        Returns:
            The full Google OAuth authorization URL.
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": self.SCOPES,
            "state": state,
            "access_type": "offline",  # Required to get a refresh token
            "prompt": "consent",        # Force consent to ensure refresh token
        }
        url = f"{self.AUTH_URL}?{urlencode(params)}"
        logger.info("Generated Google OAuth URL for user_id={}", user_id)
        return url

    async def exchange_code_for_token(self, code: str) -> dict:
        """Exchange an OAuth authorization code for an access token.

        Args:
            code: The authorization code from Google callback.

        Returns:
            Dict containing access_token, refresh_token, token_type, etc.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.redirect_uri,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if "error" in data:
                logger.error("Google token exchange failed: {}", data.get("error_description", data["error"]))
                raise ValueError(f"Google OAuth error: {data.get('error_description', data['error'])}")

            logger.info("Google token exchange successful")
            return data

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """Use the refresh token to get a new access token.

        Args:
            refresh_token: The user's stored refresh token.

        Returns:
            Dict containing the new access_token.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                logger.error("Google token refresh failed: {}", data.get("error_description", data["error"]))
                raise ValueError(f"Google OAuth refresh error: {data.get('error')}")
            return data

    async def get_user_info(self, access_token: str) -> dict:
        """Get the authenticated Google user's profile.

        Args:
            access_token: A valid Google access token.

        Returns:
            Dict containing user profile data.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.USER_INFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            logger.info("Fetched Google user info: email={}", data.get("email"))
            return data

    async def get_all_documents(self, access_token: str) -> list[dict]:
        """Fetch all Google Docs and Google Sheets metadata.

        Args:
            access_token: A valid Google access token.

        Returns:
            List of file metadata dicts.
        """
        files = []
        page_token = None
        
        # Query for Google Docs and Spreadsheets
        mime_types = "mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet'"
        
        async with httpx.AsyncClient() as client:
            while True:
                params = {
                    "q": mime_types,
                    "fields": "nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, owners)",
                    "pageSize": 100,
                }
                if page_token:
                    params["pageToken"] = page_token

                response = await client.get(
                    f"{self.DRIVE_API_BASE}/files",
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                
                files.extend(data.get("files", []))
                page_token = data.get("nextPageToken")
                
                if not page_token:
                    break

        logger.info("Fetched metadata for {} Google Docs/Sheets", len(files))
        return files

    async def export_file_content(self, access_token: str, file_id: str, mime_type: str) -> str:
        """Export the content of a Google Doc or Sheet as plain text.

        Args:
            access_token: A valid Google access token.
            file_id: The file ID on Google Drive.
            mime_type: The mime type (determines export format).

        Returns:
            The plain text content of the document.
        """
        export_mime_type = "text/plain"
        if mime_type == "application/vnd.google-apps.spreadsheet":
            export_mime_type = "text/csv"  # Spreadsheets export to CSV strings

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.DRIVE_API_BASE}/files/{file_id}/export",
                    params={"mimeType": export_mime_type},
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=60.0,
                )
                response.raise_for_status()
                return response.text
            except Exception as e:
                logger.error("Failed to export Google Drive file_id={}: {}", file_id, str(e))
                return ""


google_drive_integration = GoogleDriveIntegration()
