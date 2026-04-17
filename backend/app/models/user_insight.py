"""User insight model for AI-generated insights."""

from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class UserInsight(Base):
    """AI-generated insights for users."""

    __tablename__ = "user_insights"

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

    insight_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'weekly_summary', 'pattern_detected', 'suggestion', etc.

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    metadata: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )  # Additional data (stats, recommendations, etc.)

    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="insights")

    __table_args__ = (
        Index("ix_user_insights_user_created", "user_id", "created_at"),
    )
