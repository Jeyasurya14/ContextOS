# backend/app/services/cache_service.py

import json

import redis.asyncio as redis
from loguru import logger

from app.core.config import settings


class CacheService:
    """Redis-based caching service for query results and session data."""

    DEFAULT_TTL = 3600

    def __init__(self) -> None:
        """Initialize the cache service. Connection is lazy-loaded."""
        self._client: redis.Redis | None = None

    @property
    def client(self) -> redis.Redis:
        """Lazy-initialize the Redis client."""
        if self._client is None:
            self._client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client

    async def get(self, key: str) -> str | None:
        """Get a cached value by key.

        Args:
            key: The cache key.

        Returns:
            The cached string value, or None if not found.
        """
        try:
            value = await self.client.get(key)
            return value
        except Exception as e:
            logger.warning("Cache get failed for key={}: {}", key, type(e).__name__)
            return None

    async def get_json(self, key: str) -> dict | list | None:
        """Get a cached JSON value by key.

        Args:
            key: The cache key.

        Returns:
            The parsed JSON value, or None if not found or invalid.
        """
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return None

    async def set(self, key: str, value: str, ttl: int | None = None) -> None:
        """Set a cached string value.

        Args:
            key: The cache key.
            value: The string value to cache.
            ttl: Time-to-live in seconds. Defaults to DEFAULT_TTL.
        """
        try:
            await self.client.set(key, value, ex=ttl or self.DEFAULT_TTL)
        except Exception as e:
            logger.warning("Cache set failed for key={}: {}", key, type(e).__name__)

    async def set_json(self, key: str, value: dict | list, ttl: int | None = None) -> None:
        """Set a cached JSON value.

        Args:
            key: The cache key.
            value: The dict or list to cache as JSON.
            ttl: Time-to-live in seconds.
        """
        try:
            raw = json.dumps(value)
            await self.set(key, raw, ttl=ttl)
        except (TypeError, ValueError) as e:
            logger.warning("Cache set_json failed for key={}: {}", key, type(e).__name__)

    async def delete(self, key: str) -> None:
        """Delete a cached value.

        Args:
            key: The cache key to delete.
        """
        try:
            await self.client.delete(key)
        except Exception as e:
            logger.warning("Cache delete failed for key={}: {}", key, type(e).__name__)

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a glob pattern.

        Args:
            pattern: The glob pattern (e.g., "user:*:context").

        Returns:
            Number of keys deleted.
        """
        try:
            keys = []
            async for key in self.client.scan_iter(match=pattern, count=100):
                keys.append(key)
            if keys:
                await self.client.delete(*keys)
            return len(keys)
        except Exception as e:
            logger.warning("Cache delete_pattern failed for {}: {}", pattern, type(e).__name__)
            return 0

    async def incr(self, key: str, ttl: int | None = None) -> int:
        """Increment an integer counter.

        Args:
            key: The counter key.
            ttl: Optional TTL to set if the key is new.

        Returns:
            The new counter value.
        """
        try:
            value = await self.client.incr(key)
            if value == 1 and ttl:
                await self.client.expire(key, ttl)
            return value
        except Exception as e:
            logger.warning("Cache incr failed for key={}: {}", key, type(e).__name__)
            return 0

    async def close(self) -> None:
        """Close the Redis connection."""
        if self._client is not None:
            await self._client.close()
            self._client = None
            logger.info("Cache connection closed")


cache_service = CacheService()
