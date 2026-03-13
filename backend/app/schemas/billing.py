# backend/app/schemas/billing.py

from datetime import datetime

from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    """Schema for creating a Razorpay order."""

    plan: str = Field(pattern="^(pro|team)$")


class OrderResponse(BaseModel):
    """Schema for Razorpay order response."""

    order_id: str
    amount: int
    currency: str
    razorpay_key_id: str


class PaymentVerify(BaseModel):
    """Schema for verifying a Razorpay payment."""

    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str = Field(pattern="^(pro|team)$")


class PaymentVerifyResponse(BaseModel):
    """Schema for payment verification response."""

    success: bool
    plan: str


class SubscriptionResponse(BaseModel):
    """Schema for subscription status response."""

    plan: str
    status: str
    razorpay_subscription_id: str | None = None
    current_period_end: datetime | None = None


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
    price_inr: int
    queries_per_day: str
    max_integrations: str
    max_chunks: str
    features: list[str]
