# backend/app/schemas/billing.py

from datetime import datetime

from pydantic import BaseModel, Field


class CheckoutCreate(BaseModel):
    """Schema for creating a Stripe checkout session."""

    price_id: str = Field(min_length=1)
    success_url: str | None = None
    cancel_url: str | None = None


class CheckoutResponse(BaseModel):
    """Schema for checkout session response."""

    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    """Schema for Stripe customer portal response."""

    portal_url: str


class SubscriptionResponse(BaseModel):
    """Schema for subscription status response."""

    plan: str
    status: str
    stripe_subscription_id: str | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False


class UsageResponse(BaseModel):
    """Schema for usage data response."""

    plan: str
    queries_today: int
    queries_limit: int
    chunks_total: int
    chunks_limit: int
    percentage_used: float


class BillingEventResponse(BaseModel):
    """Schema for billing event data."""

    id: str
    event_type: str
    amount: float | None = None
    currency: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanInfo(BaseModel):
    """Schema for plan details."""

    name: str
    price_monthly: float
    price_yearly: float
    queries_per_day: int
    max_integrations: int
    max_chunks: int
    team_members: int
    features: list[str]
