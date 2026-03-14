# backend/app/models/integration.py

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Integration(Base):
    """Integration model for connected services (GitHub, Notion, Slack)."""

    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    provider_user_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    provider_username: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    encrypted_access_token: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    encrypted_refresh_token: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scopes: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    total_chunks: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sync_status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
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

    user: Mapped["User"] = relationship("User", back_populates="integrations")
