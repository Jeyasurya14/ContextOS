# backend/app/services/context_processor.py

import json
import hashlib
from uuid import uuid4

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.context_chunk import ContextChunk
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service


class ContextProcessor:
    """Service for processing raw content into chunks, embedding, and storing them."""

    MAX_CHUNK_SIZE = 1500
    CHUNK_OVERLAP = 200

    def _split_text(self, text: str) -> list[str]:
        """Split text into overlapping chunks.

        Args:
            text: The raw text to split.

        Returns:
            List of text chunks.
        """
        if not text or not text.strip():
            return []

        text = text.strip()
        if len(text) <= self.MAX_CHUNK_SIZE:
            return [text]

        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = start + self.MAX_CHUNK_SIZE

            if end < len(text):
                last_newline = text.rfind("\n", start, end)
                last_period = text.rfind(". ", start, end)
                last_space = text.rfind(" ", start, end)

                if last_newline > start + self.MAX_CHUNK_SIZE // 2:
                    end = last_newline + 1
                elif last_period > start + self.MAX_CHUNK_SIZE // 2:
                    end = last_period + 2
                elif last_space > start + self.MAX_CHUNK_SIZE // 2:
                    end = last_space + 1

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - self.CHUNK_OVERLAP
            if start >= len(text):
                break

        return chunks

    async def process_and_store(
        self,
        content: str,
        source_type: str,
        source_url: str,
        user_id: str,
        integration_id: str | None,
        metadata: dict,
        db: AsyncSession,
    ) -> int:
        """Process raw content into chunks, generate embeddings, and store in DB + Qdrant.

        This is the interface contract called by all workers:
            await context_processor.process_and_store(
                content=str, source_type=str, source_url=str,
                user_id=UUID, integration_id=UUID|None,
                metadata=dict, db=AsyncSession
            ) → int

        Args:
            content: Raw text content to process.
            source_type: One of github_commit, github_pr, github_issue, notion,
                         slack_channel, slack_message, vscode_file.
            source_url: URL or identifier of the source.
            user_id: The user ID who owns this content.
            integration_id: The integration ID that produced this content (or None).
            metadata: Additional metadata dict to store.
            db: An active async database session.

        Returns:
            Number of new chunks stored.
        """
        if not content or not content.strip():
            logger.debug("Skipping empty content for user_id={}", user_id)
            return 0

        chunks_text = self._split_text(content)
        if not chunks_text:
            return 0

        stored_count = 0
        qdrant_points: list[dict] = []

        for idx, chunk_text in enumerate(chunks_text):
            content_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()

            existing = await db.execute(
                select(ContextChunk).where(
                    ContextChunk.user_id == user_id,
                    ContextChunk.content_hash == content_hash,
                )
            )
            if existing.scalar_one_or_none() is not None:
                logger.debug("Skipping duplicate chunk: hash={}", content_hash[:12])
                continue

            embedding = embedding_service.embed_text(chunk_text)
            point_id = qdrant_service.generate_point_id()

            token_count = len(chunk_text.split())

            metadata_json = json.dumps(metadata) if metadata else None

            chunk = ContextChunk(
                id=str(uuid4()),
                user_id=user_id,
                integration_id=integration_id,
                source_type=source_type,
                source_url=source_url,
                content=chunk_text,
                content_hash=content_hash,
                chunk_index=idx,
                token_count=token_count,
                qdrant_point_id=point_id,
                metadata_json=metadata_json,
            )
            db.add(chunk)

            qdrant_points.append({
                "id": point_id,
                "vector": embedding,
                "payload": {
                    "user_id": user_id,
                    "chunk_id": chunk.id,
                    "source_type": source_type,
                    "source_url": source_url,
                    "integration_id": integration_id or "",
                    "content_preview": chunk_text[:200],
                    "token_count": token_count,
                },
            })
            stored_count += 1

        if qdrant_points:
            try:
                qdrant_service.upsert_batch(qdrant_points)
            except Exception as e:
                logger.error(
                    "Failed to upsert {} vectors to Qdrant for user_id={}: {}",
                    len(qdrant_points), user_id, type(e).__name__,
                )

        if stored_count > 0:
            logger.info(
                "Stored {} chunks: user_id={}, source_type={}, source={}",
                stored_count, user_id, source_type, source_url[:60] if source_url else "",
            )

        return stored_count


context_processor = ContextProcessor()
