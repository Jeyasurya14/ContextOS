# backend/app/services/embedding_service.py

import hashlib
from typing import Optional

from loguru import logger
from openai import AsyncOpenAI, RateLimitError, APIConnectionError, APITimeoutError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.core.config import settings


class EmbeddingService:
    """Service for generating text embeddings using OpenAI."""

    EMBEDDING_DIM = 1536
    MAX_RETRIES = 3

    def __init__(self) -> None:
        """Initialize the embedding service."""
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        """Lazy-load the OpenAI client with production optimizations."""
        if self._client is None:
            # Configure timeout and limits
            self._client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                timeout=30.0,  # 30 second timeout
                max_retries=2,  # Let tenacity handle retries
            )
        return self._client

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(
            (RateLimitError, APIConnectionError, APITimeoutError)
        ),
        before_sleep=lambda retry_state: logger.warning(
            f"Embedding retry {retry_state.attempt_number}/{MAX_RETRIES} after {retry_state.outcome.exception()}"
        ),
    )
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
            logger.error(
                f"OpenAI embedding failed after retries: {type(e).__name__}: {e}"
            )
            return [0.0] * self.EMBEDDING_DIM

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(
            (RateLimitError, APIConnectionError, APITimeoutError)
        ),
    )
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a batch of texts.

        Args:
            texts: List of input texts to embed.

        Returns:
            List of embedding vectors.
        """
        if not texts:
            return []

        # OpenAI has a limit of 2048 inputs per batch
        MAX_BATCH_SIZE = 2048
        all_embeddings = []

        for i in range(0, len(texts), MAX_BATCH_SIZE):
            batch = texts[i : i + MAX_BATCH_SIZE]
            cleaned = [t[:8192] if t and t.strip() else "" for t in batch]

            try:
                response = await self.client.embeddings.create(
                    model=settings.OPENAI_EMBEDDING_MODEL,
                    input=cleaned,
                )
                all_embeddings.extend([item.embedding for item in response.data])
            except Exception as e:
                logger.error(
                    f"OpenAI batch embedding failed at batch {i}: {type(e).__name__}: {e}"
                )
                # Pad with zero vectors for failed batch
                all_embeddings.extend([[0.0] * self.EMBEDDING_DIM for _ in batch])

        return all_embeddings

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
