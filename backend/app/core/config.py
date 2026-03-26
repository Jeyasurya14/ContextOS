# backend/app/core/config.py

from pathlib import Path
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    APP_NAME: str = "ContextOS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    DATABASE_URL: str = ""
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30

    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 10

    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "context_chunks"
    QDRANT_USE_HTTPS: bool = False

    JWT_SECRET_KEY: str = "change-me-in-production-minimum-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ENCRYPTION_KEY: str = "change-me-in-production-32-bytes"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_TEMPERATURE: float = 0.1

    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_WEBHOOK_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/github/callback"

    NOTION_CLIENT_ID: str = ""
    NOTION_CLIENT_SECRET: str = ""
    NOTION_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/notion/callback"

    SLACK_CLIENT_ID: str = ""
    SLACK_CLIENT_SECRET: str = ""
    SLACK_SIGNING_SECRET: str = ""
    SLACK_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/slack/callback"

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    RAZORPAY_PRO_PLAN_ID: str = ""
    RAZORPAY_TEAM_PLAN_ID: str = ""
    RAZORPAY_CURRENCY: str = "INR"
    RAZORPAY_PRO_AMOUNT: int = 166700
    RAZORPAY_TEAM_AMOUNT: int = 828200

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    RATE_LIMIT_FREE: int = 50
    RATE_LIMIT_PRO: int = 500
    RATE_LIMIT_TEAM: int = 2000

    @field_validator("DEBUG", "QDRANT_USE_HTTPS", mode="before")
    @classmethod
    def parse_bool_like_values(cls, value: object) -> object:
        """Accept common deployment booleans like release/production/1/0."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production"}:
                return False
        return value

    @field_validator(
        "DATABASE_POOL_SIZE",
        "DATABASE_MAX_OVERFLOW",
        "DATABASE_POOL_TIMEOUT",
        "REDIS_MAX_CONNECTIONS",
        "OPENAI_MAX_TOKENS",
        "RAZORPAY_PRO_AMOUNT",
        "RAZORPAY_TEAM_AMOUNT",
        "RATE_LIMIT_FREE",
        "RATE_LIMIT_PRO",
        "RATE_LIMIT_TEAM",
        mode="before",
    )
    @classmethod
    def parse_int_like_values(cls, value: object) -> object:
        """Allow values like `50/day` in env files by extracting the leading int."""
        if isinstance(value, str):
            cleaned = value.strip()
            if "/" in cleaned:
                cleaned = cleaned.split("/", 1)[0]
            if cleaned.isdigit():
                return int(cleaned)
        return value

    @property
    def qdrant_url(self) -> str:
        raw_host = self.QDRANT_HOST.strip().rstrip("/")
        if raw_host.startswith(("http://", "https://")):
            return raw_host

        scheme = "https" if self.QDRANT_API_KEY or self.QDRANT_USE_HTTPS else "http"
        if scheme == "https":
            return f"{scheme}://{raw_host}"
        return f"{scheme}://{raw_host}:{self.QDRANT_PORT}"

    @property
    def qdrant_uses_url(self) -> bool:
        raw_host = self.QDRANT_HOST.strip()
        return raw_host.startswith(("http://", "https://")) or bool(self.QDRANT_API_KEY) or self.QDRANT_USE_HTTPS

    @property
    def qdrant_host_display(self) -> str:
        raw_host = self.QDRANT_HOST.strip().rstrip("/")
        if raw_host.startswith(("http://", "https://")):
            parsed = urlsplit(raw_host)
            return parsed.netloc or raw_host
        return raw_host

    CORS_ORIGINS: str = ""

    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins. If CORS_ORIGINS env var is set, use it; otherwise use defaults."""
        if self.CORS_ORIGINS:
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return [
            self.FRONTEND_URL,
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "https://contextos.vercel.app",
            "https://*.vercel.app",
        ]

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
