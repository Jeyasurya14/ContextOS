# backend/app/services/embedding_service.py

import hashlib

from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings


class EmbeddingService:
    """Service for generating text embeddings using OpenAI."""

    EMBEDDING_DIM = 1536

    def __init__(self) -> None:
        """Initialize the embedding service."""
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        """Lazy-load the OpenAI client."""
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def embed_text(self, text: str) -> list[float]:
        """Generate an embedding vector for a single text string.

        Args:
            text: The input text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        if not text or not text.strip():
            logger.warning("Attempted to embed empty text, returning zero vector")
            return [0.0] * self.EMBEDDING_DIM

        try:
            response = await self.client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=text[:8192],
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"OpenAI embedding failed: {e}")
            return [0.0] * self.EMBEDDING_DIM

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a batch of texts.

        Args:
            texts: List of input texts to embed.

        Returns:
            List of embedding vectors.
        """
        if not texts:
            return []

        cleaned = [t[:8192] if t and t.strip() else "" for t in texts]

        try:
            response = await self.client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=cleaned,
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"OpenAI batch embedding failed: {e}")
            return [[0.0] * self.EMBEDDING_DIM for _ in texts]

    def embed_text_sync(self, text: str) -> list[float]:
        """Synchronous embedding for backward compatibility."""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(self.embed_text(text))

    @staticmethod
    def content_hash(text: str) -> str:
        """Generate a SHA256 hash of text content for deduplication.

        Args:
            text: The text to hash.

        Returns:
            Hex string of the SHA256 hash.
        """
        return hashlib.sha256(text.encode("utf-8")).hexdigest()


embedding_service = EmbeddingService()
