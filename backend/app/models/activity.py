"""Activity model for tracking user and team actions."""

from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class Activity(Base):
    """Activity tracking for feed and notifications."""

    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )

    activity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # 'prompt_created', 'integration_synced', 'project_created', etc.
    
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'prompt', 'integration', 'project', 'conversation'
    
    entity_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), nullable=True
    )

    metadata: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )  # Additional context (title, description, etc.)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="activities")

    __table_args__ = (
        Index("ix_activities_user_created", "user_id", "created_at"),
        Index("ix_activities_team_created", "team_id", "created_at"),
    )
