# backend/app/services/qdrant_service.py

from uuid import uuid4

from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.core.config import settings


class QdrantService:
    """Service for vector storage and similarity search using Qdrant."""

    def __init__(self) -> None:
        """Initialize Qdrant client and ensure collection exists."""
        self._client: QdrantClient | None = None
        self.collection_name = settings.QDRANT_COLLECTION
        self.vector_size = 384

    @property
    def client(self) -> QdrantClient:
        """Lazy-initialize the Qdrant client."""
        if self._client is None:
            self._client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
                timeout=30.0,
            )
            self._ensure_collection()
        return self._client

    def _ensure_collection(self) -> None:
        """Create the collection if it does not exist."""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qdrant_models.VectorParams(
                        size=self.vector_size,
                        distance=qdrant_models.Distance.COSINE,
                    ),
                )
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="user_id",
                    field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
                )
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="source_type",
                    field_schema=qdrant_models.PayloadSchemaType.KEYWORD,
                )
                logger.info("Created Qdrant collection: {}", self.collection_name)
            else:
                logger.info("Qdrant collection already exists: {}", self.collection_name)
        except Exception as e:
            logger.error("Failed to ensure Qdrant collection: {}", type(e).__name__)
            raise

    def upsert_vector(
        self,
        point_id: str,
        vector: list[float],
        payload: dict,
    ) -> None:
        """Insert or update a single vector point.

        Args:
            point_id: Unique identifier for the point.
            vector: The embedding vector.
            payload: Metadata payload to store with the vector.
        """
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    qdrant_models.PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload,
                    )
                ],
            )
        except Exception as e:
            logger.error("Failed to upsert vector {}: {}", point_id, type(e).__name__)
            raise

    def upsert_batch(
        self,
        points: list[dict],
    ) -> None:
        """Insert or update a batch of vector points.

        Args:
            points: List of dicts with keys: id, vector, payload.
        """
        if not points:
            return

        try:
            qdrant_points = [
                qdrant_models.PointStruct(
                    id=p["id"],
                    vector=p["vector"],
                    payload=p["payload"],
                )
                for p in points
            ]
            self.client.upsert(
                collection_name=self.collection_name,
                points=qdrant_points,
            )
            logger.info("Upserted {} vectors to Qdrant", len(points))
        except Exception as e:
            logger.error("Failed to upsert batch ({} points): {}", len(points), type(e).__name__)
            raise

    def search(
        self,
        query_vector: list[float],
        user_id: str,
        source_types: list[str] | None = None,
        limit: int = 10,
        score_threshold: float = 0.3,
    ) -> list[dict]:
        """Search for similar vectors filtered by user_id.

        Args:
            query_vector: The query embedding vector.
            user_id: Filter results to this user.
            source_types: Optional filter for specific source types.
            limit: Maximum number of results.
            score_threshold: Minimum similarity score.

        Returns:
            List of dicts with id, score, and payload.
        """
        must_conditions = [
            qdrant_models.FieldCondition(
                key="user_id",
                match=qdrant_models.MatchValue(value=user_id),
            )
        ]

        if source_types:
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="source_type",
                    match=qdrant_models.MatchAny(any=source_types),
                )
            )

        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=qdrant_models.Filter(must=must_conditions),
                limit=limit,
                score_threshold=score_threshold,
            )

            return [
                {
                    "id": str(r.id),
                    "score": r.score,
                    "payload": r.payload or {},
                }
                for r in results
            ]
        except Exception as e:
            logger.error("Qdrant search failed: {}", type(e).__name__)
            return []

    def delete_by_user(self, user_id: str) -> None:
        """Delete all vectors for a specific user.

        Args:
            user_id: The user whose vectors to delete.
        """
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=qdrant_models.FilterSelector(
                    filter=qdrant_models.Filter(
                        must=[
                            qdrant_models.FieldCondition(
                                key="user_id",
                                match=qdrant_models.MatchValue(value=user_id),
                            )
                        ]
                    )
                ),
            )
            logger.info("Deleted all Qdrant vectors for user_id={}", user_id)
        except Exception as e:
            logger.error("Failed to delete vectors for user_id={}: {}", user_id, type(e).__name__)
            raise

    def delete_by_integration(self, user_id: str, integration_id: str) -> None:
        """Delete all vectors for a specific integration.

        Args:
            user_id: The user ID.
            integration_id: The integration whose vectors to delete.
        """
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=qdrant_models.FilterSelector(
                    filter=qdrant_models.Filter(
                        must=[
                            qdrant_models.FieldCondition(
                                key="user_id",
                                match=qdrant_models.MatchValue(value=user_id),
                            ),
                            qdrant_models.FieldCondition(
                                key="integration_id",
                                match=qdrant_models.MatchValue(value=integration_id),
                            ),
                        ]
                    )
                ),
            )
            logger.info("Deleted Qdrant vectors for integration_id={}", integration_id)
        except Exception as e:
            logger.error("Failed to delete vectors for integration_id={}: {}", integration_id, type(e).__name__)
            raise

    @staticmethod
    def generate_point_id() -> str:
        """Generate a new UUID for a Qdrant point."""
        return str(uuid4())


qdrant_service = QdrantService()
