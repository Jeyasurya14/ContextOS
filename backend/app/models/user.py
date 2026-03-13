# backend/app/models/user.py

from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    """User account model."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    plan: Mapped[str] = mapped_column(
        String(50), default="free", nullable=False
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    stripe_price_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    subscription_status: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    subscription_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    api_key_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    api_key_prefix: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )
    query_count_today: Mapped[int] = mapped_column(default=0, nullable=False)
    query_count_reset_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    team_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )
    team_role: Mapped[str | None] = mapped_column(
        String(50), nullable=True
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

    projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="owner", lazy="selectin"
    )
    integrations: Mapped[list["Integration"]] = relationship(
        "Integration", back_populates="user", lazy="selectin"
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation", back_populates="user", lazy="selectin"
    )

    @property
    def name(self) -> str:
        """Name property for frontend compatibility."""
        return self.full_name
