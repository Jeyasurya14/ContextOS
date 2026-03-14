# backend/app/models/team.py

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, DateTime, Boolean, Integer, Text, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Team(Base):
    """Team model for shared context across members."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    plan: Mapped[str] = mapped_column(
        String(50), default="free", nullable=False
    )
    max_members: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )
    max_chunks: Mapped[int] = mapped_column(
        Integer, default=10000, nullable=False
    )
    total_chunks: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
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


class TeamInvitation(Base):
    """Invitation to join a team."""

    __tablename__ = "team_invitations"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    team_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    invited_by: Mapped[str] = mapped_column(
        String(36), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50), default="member", nullable=False
    )
    token: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    message: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
