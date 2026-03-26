# backend/app/services/context_retriever.py

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.context_chunk import ContextChunk
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import search_vectors


class ContextRetriever:
    """Retrieves relevant context chunks based on user queries."""

    def __init__(self) -> None:
        """Initialize the context retriever."""
        self.max_results = 15
        self.score_threshold = 0.1  # Lowered to retrieve more results

    async def retrieve(
        self,
        query: str,
        user_id: str,
        db: AsyncSession,
        source_types: list[str] | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        """Retrieve relevant context chunks for a query.

        Args:
            query: The user's natural language query.
            user_id: The user ID to scope the search.
            db: Active async database session.
            source_types: Optional explicit source type filter.
            limit: Optional override for max results.

        Returns:
            List of dicts with keys: content, source_type, source_url, score, metadata.
        """
        if not query or not query.strip():
            return []

        effective_limit = limit or self.max_results

        if source_types is None:
            classification = intent_classifier.classify(query)
            source_types = classification.get("sources")

        query_embedding = embedding_service.embed_text(query)

        qdrant_results = await search_vectors(
            query_vector=query_embedding,
            user_id=user_id,
            source_types=source_types,
            limit=effective_limit,
            score_threshold=self.score_threshold,
        )

        if not qdrant_results:
            logger.info("No relevant context found for user_id={}", user_id)
            return []

        chunk_ids = [r["payload"].get("chunk_id") for r in qdrant_results if r["payload"].get("chunk_id")]
        score_map = {
            r["payload"].get("chunk_id"): r["score"]
            for r in qdrant_results
            if r["payload"].get("chunk_id")
        }

        if not chunk_ids:
            return []

        result = await db.execute(
            select(ContextChunk).where(
                ContextChunk.id.in_(chunk_ids),
                ContextChunk.user_id == user_id,
            )
        )
        chunks = result.scalars().all()

        retrieved: list[dict] = []
        for chunk in chunks:
            score = score_map.get(chunk.id, 0.0)
            retrieved.append({
                "content": chunk.content,
                "source_type": chunk.source_type,
                "source_url": chunk.source_url or "",
                "score": score,
                "metadata": chunk.metadata_json or "{}",
                "chunk_id": chunk.id,
            })

        retrieved.sort(key=lambda x: x["score"], reverse=True)

        logger.info(
            "Retrieved {} chunks for user_id={}, top_score={:.3f}",
            len(retrieved), user_id,
            retrieved[0]["score"] if retrieved else 0.0,
        )

        return retrieved


context_retriever = ContextRetriever()
