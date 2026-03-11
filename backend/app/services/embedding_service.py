# backend/app/services/embedding_service.py

import hashlib
from functools import lru_cache

from loguru import logger
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Service for generating text embeddings using sentence-transformers."""

    MODEL_NAME = "all-MiniLM-L6-v2"
    EMBEDDING_DIM = 384

    def __init__(self) -> None:
        """Initialize the embedding service. Model is lazy-loaded on first use."""
        self._model: SentenceTransformer | None = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy-load the sentence transformer model."""
        if self._model is None:
            logger.info("Loading embedding model: {}", self.MODEL_NAME)
            self._model = SentenceTransformer(self.MODEL_NAME)
            logger.info("Embedding model loaded successfully")
        return self._model

    def embed_text(self, text: str) -> list[float]:
        """Generate an embedding vector for a single text string.

        Args:
            text: The input text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        if not text or not text.strip():
            logger.warning("Attempted to embed empty text, returning zero vector")
            return [0.0] * self.EMBEDDING_DIM

        truncated = text[:8192]
        embedding = self.model.encode(truncated, show_progress_bar=False)
        return embedding.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a batch of texts.

        Args:
            texts: List of input texts to embed.

        Returns:
            List of embedding vectors.
        """
        if not texts:
            return []

        cleaned = []
        for t in texts:
            if t and t.strip():
                cleaned.append(t[:8192])
            else:
                cleaned.append("")

        embeddings = self.model.encode(cleaned, show_progress_bar=False, batch_size=32)
        result = []
        for i, emb in enumerate(embeddings):
            if cleaned[i]:
                result.append(emb.tolist())
            else:
                result.append([0.0] * self.EMBEDDING_DIM)

        return result

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
