# backend/app/services/team_context_service.py

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.user import User
from app.models.context_chunk import ContextChunk
from app.models.integration import Integration


class TeamContextService:
    """Service for retrieving shared team context across members."""

    async def get_team_user_ids(self, team_id: str, db: AsyncSession) -> list[str]:
        """Get all user IDs belonging to a team."""
        result = await db.execute(
            select(User.id).where(User.team_id == team_id, User.is_active.is_(True))
        )
        return [row[0] for row in result.all()]

    async def get_team_chunks(
        self,
        team_id: str,
        db: AsyncSession,
        source_types: list[str] | None = None,
        limit: int = 100,
    ) -> list[ContextChunk]:
        """Get context chunks from all team members."""
        user_ids = await self.get_team_user_ids(team_id, db)
        if not user_ids:
            return []

        query = select(ContextChunk).where(ContextChunk.user_id.in_(user_ids))
        if source_types:
            query = query.where(ContextChunk.source_type.in_(source_types))
        query = query.order_by(ContextChunk.created_at.desc()).limit(limit)

        result = await db.execute(query)
        chunks = list(result.scalars().all())
        logger.debug(
            "Retrieved {} team chunks for team_id={}", len(chunks), team_id
        )
        return chunks

    async def get_team_integration_ids(
        self, team_id: str, db: AsyncSession
    ) -> list[str]:
        """Get all integration IDs for team members."""
        user_ids = await self.get_team_user_ids(team_id, db)
        if not user_ids:
            return []

        result = await db.execute(
            select(Integration.id).where(
                Integration.user_id.in_(user_ids),
                Integration.is_active.is_(True),
            )
        )
        return [row[0] for row in result.all()]

    async def get_team_chunk_ids_for_qdrant(
        self,
        team_id: str,
        db: AsyncSession,
    ) -> list[str]:
        """Get chunk IDs from all team members for Qdrant filtering."""
        user_ids = await self.get_team_user_ids(team_id, db)
        if not user_ids:
            return []

        result = await db.execute(
            select(ContextChunk.id).where(ContextChunk.user_id.in_(user_ids))
        )
        return [row[0] for row in result.all()]

    async def count_team_chunks(self, team_id: str, db: AsyncSession) -> int:
        """Count total chunks across all team members."""
        from sqlalchemy import func

        user_ids = await self.get_team_user_ids(team_id, db)
        if not user_ids:
            return 0

        result = await db.execute(
            select(func.count()).select_from(ContextChunk).where(
                ContextChunk.user_id.in_(user_ids)
            )
        )
        return result.scalar_one()


team_context_service = TeamContextService()
