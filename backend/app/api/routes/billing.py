# backend/app/api/routes/billing.py

import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.billing import BillingEvent
from app.schemas.billing import (
    OrderCreate,
    OrderResponse,
    PaymentVerify,
    PaymentVerifyResponse,
    SubscriptionResponse,
    UsageResponse,
    BillingEventResponse,
)
from app.api.deps import get_current_user
from app.services.billing_service import billing_service, PLAN_LIMITS

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans")
async def get_plans() -> dict:
    """Return plan details in INR. Public endpoint, no auth required."""
    return {
        "free": {
            "price_inr": 0,
            "queries_per_day": "50",
            "features": [
                "50 queries/day",
                "3 integrations",
                "10K context chunks",
                "Community support",
            ],
        },
        "pro": {
            "price_inr": 1667,
            "queries_per_day": "unlimited",
            "features": [
                "Unlimited queries/day",
                "Unlimited integrations",
                "100K context chunks",
                "Team shared context",
                "Priority support",
            ],
        },
        "team": {
            "price_inr": 8282,
            "queries_per_day": "unlimited",
            "features": [
                "Unlimited queries/day",
                "Unlimited integrations",
                "Unlimited context chunks",
                "Unlimited team members",
                "SSO & SAML",
                "Dedicated support",
                "Custom SLA",
            ],
        },
    }


@router.post("/create-order", response_model=OrderResponse)
async def create_order(
    body: OrderCreate,
    user: User = Depends(get_current_user),
) -> OrderResponse:
    """Create a Razorpay order for plan upgrade."""
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured",
        )

    try:
        order_data = billing_service.create_order(user_id=user.id, plan=body.plan)
        return OrderResponse(**order_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Razorpay order creation failed for user_id={}: {}", user.id, type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error. Please try again.",
        )


@router.post("/verify-payment", response_model=PaymentVerifyResponse)
async def verify_payment(
    body: PaymentVerify,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentVerifyResponse:
    """Verify Razorpay payment and activate subscription."""
    is_valid = billing_service.verify_payment(
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature",
        )

    updated_user = await billing_service.activate_subscription(
        user_id=user.id,
        plan=body.plan,
        payment_id=body.razorpay_payment_id,
        db=db,
    )

    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    billing_event = BillingEvent(
        user_id=user.id,
        team_id=user.team_id,
        event_type="payment.verified",
        razorpay_event_id=f"verify_{body.razorpay_payment_id}",
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_order_id=body.razorpay_order_id,
        amount=billing_service.PLAN_PRICES_PAISE.get(body.plan, 0) / 100.0 if hasattr(billing_service, 'PLAN_PRICES_PAISE') else None,
        currency="inr",
        status="verified",
    )
    db.add(billing_event)
    await db.flush()

    logger.info("Payment verified for user_id={} plan={}", user.id, body.plan)
    return PaymentVerifyResponse(success=True, plan=body.plan)


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """Get current subscription status."""
    sub_data = await billing_service.get_subscription(user_id=user.id, db=db)
    return SubscriptionResponse(**sub_data)


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    user: User = Depends(get_current_user),
) -> UsageResponse:
    """Get current usage for the user."""
    limits = PLAN_LIMITS.get(user.plan, PLAN_LIMITS["free"])
    total_chunks = 0

    if user.integrations:
        total_chunks = sum(i.total_chunks for i in user.integrations)

    queries_limit = limits["queries_per_day"]
    chunks_limit = limits["max_chunks"]
    pct = (user.query_count_today / queries_limit * 100) if queries_limit > 0 else 0

    return UsageResponse(
        plan=user.plan,
        queries_today=user.query_count_today,
        queries_limit=queries_limit,
        chunks_total=total_chunks,
        chunks_limit=chunks_limit,
        percentage_used=round(min(pct, 100.0), 1),
    )


@router.get("/events", response_model=list[BillingEventResponse])
async def list_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BillingEventResponse]:
    """List billing events for the current user."""
    result = await db.execute(
        select(BillingEvent)
        .where(BillingEvent.user_id == user.id)
        .order_by(BillingEvent.created_at.desc())
        .limit(50)
    )
    events = result.scalars().all()
    return [
        BillingEventResponse(
            id=e.id,
            event_type=e.event_type,
            amount=e.amount,
            currency=e.currency,
            status=e.status,
            created_at=e.created_at,
        )
        for e in events
    ]


@router.post("/webhooks/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle Razorpay webhook events. No auth — signature verified via HMAC."""
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        return {"status": "ok"}

    payload_bytes = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    expected_signature = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        logger.warning("Razorpay webhook signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    try:
        payload = json.loads(payload_bytes)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event_type = payload.get("event", "")
    logger.info("Razorpay webhook received: type={}", event_type)

    await billing_service.handle_webhook_event(event_type, payload, db)

    return {"status": "ok"}
