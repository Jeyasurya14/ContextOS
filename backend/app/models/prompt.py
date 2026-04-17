# backend/app/models/prompt.py

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, DateTime, ForeignKey, Text, UUID, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Prompt(Base):
    """A saved prompt template — personal or shared with the user's team."""

    __tablename__ = "prompts"

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

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 'personal' (visible only to creator) or 'team' (visible to whole team)
    scope: Mapped[str] = mapped_column(String(20), nullable=False, default="personal", index=True)

    # List[str] of free-form tags
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
