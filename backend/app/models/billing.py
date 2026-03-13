# backend/app/models/billing.py

from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BillingEvent(Base):
    """Record of billing events from Razorpay."""

    __tablename__ = "billing_events"

    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    team_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    razorpay_event_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )
    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    razorpay_order_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    amount: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    currency: Mapped[str] = mapped_column(
        String(10), default="inr", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class UsageRecord(Base):
    """Daily usage tracking per user."""

    __tablename__ = "usage_records"

    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )
    query_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    sync_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
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
