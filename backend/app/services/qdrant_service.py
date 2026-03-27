# backend/app/services/qdrant_service.py

from uuid import uuid4

from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
    PayloadSchemaType,
)

from app.core.config import settings


def get_qdrant_client() -> QdrantClient:
    """Get Qdrant client configured for local or cloud."""
    if settings.qdrant_uses_url:
        return QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.QDRANT_API_KEY or None,
            timeout=30,
        )
    return QdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
        timeout=30,
    )


qdrant_client = get_qdrant_client()
qdrant_available = False


async def init_collection() -> bool:
    """Create collection if not exists. Called on startup."""
    global qdrant_available
    try:
        collections = qdrant_client.get_collections()
        names = [c.name for c in collections.collections]
        if settings.QDRANT_COLLECTION not in names:
            qdrant_client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(
                    size=1536,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created Qdrant collection: {settings.QDRANT_COLLECTION}")
        else:
            logger.info(f"Qdrant collection exists: {settings.QDRANT_COLLECTION}")

        # Ensure payload indexes exist for filterable fields
        _ensure_payload_indexes()

        qdrant_available = True
        return True
    except Exception as e:
        qdrant_available = False
        logger.warning(
            "Qdrant unavailable during startup; continuing without vector search. "
            "endpoint={} collection={} error={}",
            settings.qdrant_host_display,
            settings.QDRANT_COLLECTION,
            e,
        )
        return False


def _ensure_payload_indexes() -> None:
    """Create payload indexes required for filtered search. Safe to call repeatedly."""
    index_specs = [
        ("user_id", PayloadSchemaType.UUID),
        ("source_type", PayloadSchemaType.KEYWORD),
        ("integration_id", PayloadSchemaType.KEYWORD),
    ]
    for field, schema_type in index_specs:
        try:
            qdrant_client.create_payload_index(
                collection_name=settings.QDRANT_COLLECTION,
                field_name=field,
                field_schema=schema_type,
            )
            logger.info(f"Qdrant payload index ensured: {field} ({schema_type})")
        except Exception as e:
            # Index may already exist — Qdrant raises an error but it's safe to ignore
            logger.debug(f"Payload index {field} already exists or skipped: {e}")


async def upsert_vectors(points: list[dict]) -> bool:
    """Upsert batch of vectors to Qdrant."""
    try:
        qdrant_points = [
            PointStruct(
                id=p["id"],
                vector=p["vector"],
                payload=p["payload"],
            )
            for p in points
        ]
        qdrant_client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=qdrant_points,
            wait=True,
        )
        return True
    except Exception as e:
        logger.error(f"Qdrant upsert failed: {e}")
        return False

async def search_vectors(
    query_vector: list[float],
    user_id: str,
    limit: int = 10,
    score_threshold: float = 0.3,
    filters: dict | None = None,
    source_types: list[str] | None = None,
) -> list[dict]:
    """Search for similar vectors."""
    try:
        must_conditions = [
            FieldCondition(
                key="user_id",
                match=MatchValue(value=user_id),
            )
        ]
        if source_types:
            must_conditions.append(
                FieldCondition(
                    key="source_type",
                    match=MatchAny(any=source_types),
                )
            )
        if filters:
            for key, value in filters.items():
                must_conditions.append(
                    FieldCondition(key=key, match=MatchValue(value=value))
                )

        results = qdrant_client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=query_vector,
            query_filter=Filter(must=must_conditions),
            limit=limit,
            score_threshold=score_threshold,
            with_payload=True,
        )
        return [
            {
                "id": str(r.id),
                "score": r.score,
                "payload": r.payload,
            }
            for r in results
        ]
    except Exception as e:
        logger.error(f"Qdrant search failed: {e}")
        return []

async def delete_by_integration(integration_id: str) -> bool:
    """Delete vectors by integration ID."""
    try:
        qdrant_client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="integration_id",
                        match=MatchValue(value=integration_id),
                    )
                ]
            ),
        )
        return True
    except Exception as e:
        logger.error(f"Qdrant delete failed: {e}")
        return False


async def delete_by_user(user_id: str) -> bool:
    """Delete all vectors for a user."""
    try:
        qdrant_client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=user_id),
                    )
                ]
            ),
        )
        return True
    except Exception as e:
        logger.error(f"Qdrant delete by user failed: {e}")
        return False


async def get_collection_stats() -> dict:
    """Get Qdrant collection statistics."""
    try:
        info = qdrant_client.get_collection(settings.QDRANT_COLLECTION)
        return {
            "total_vectors": info.vectors_count,
            "indexed_vectors": info.indexed_vectors_count,
            "status": str(info.status),
        }
    except Exception as e:
        logger.error(f"Qdrant stats failed: {e}")
        return {"total_vectors": 0, "status": "error"}


async def check_qdrant_health() -> bool:
    """Check if Qdrant is accessible."""
    global qdrant_available
    try:
        qdrant_client.get_collections()
        qdrant_available = True
        return True
    except Exception:
        qdrant_available = False
        return False


class QdrantService:
    """Legacy compatibility wrapper."""
    
    @staticmethod
    def generate_point_id() -> str:
        return str(uuid4())
    
    def upsert_batch(self, points: list[dict]) -> None:
        import asyncio
        asyncio.create_task(upsert_vectors(points))
    
    def delete_by_integration(self, user_id: str, integration_id: str) -> None:
        import asyncio
        asyncio.create_task(delete_by_integration(integration_id))


qdrant_service = QdrantService()
