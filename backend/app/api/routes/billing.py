# backend/app/api/routes/billing.py

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.team import Team
from app.models.billing import BillingEvent
from app.schemas.billing import (
    CheckoutCreate,
    CheckoutResponse,
    PortalResponse,
    SubscriptionResponse,
    UsageResponse,
    BillingEventResponse,
)
from app.schemas.auth import MessageResponse
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])

PLAN_LIMITS = {
    "free": {"queries_per_day": 50, "max_chunks": 10000, "max_integrations": 3},
    "pro": {"queries_per_day": 1000, "max_chunks": 100000, "max_integrations": 999},
    "enterprise": {"queries_per_day": 999999, "max_chunks": 999999, "max_integrations": 999},
}


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    """Create a Stripe checkout session for plan upgrade."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured",
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        customer_id = user.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={"user_id": user.id},
            )
            customer_id = customer.id
            user.stripe_customer_id = customer_id
            await db.flush()

        success_url = body.success_url or f"{settings.FRONTEND_URL}/dashboard/billing?success=true"
        cancel_url = body.cancel_url or f"{settings.FRONTEND_URL}/dashboard/billing?canceled=true"

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": body.price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user.id},
        )

        logger.info("Checkout session created for user_id={}", user.id)
        return CheckoutResponse(
            checkout_url=session.url or "",
            session_id=session.id,
        )
    except stripe.StripeError as e:
        logger.error("Stripe error for user_id={}: {}", user.id, str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error. Please try again.",
        )


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    user: User = Depends(get_current_user),
) -> PortalResponse:
    """Create a Stripe customer portal session."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured",
        )
    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found. Subscribe to a plan first.",
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/dashboard/billing",
        )
        return PortalResponse(portal_url=session.url)
    except stripe.StripeError as e:
        logger.error("Stripe portal error for user_id={}: {}", user.id, str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error",
        )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Get current subscription status."""
    result = SubscriptionResponse(
        plan=user.plan,
        status="active" if user.plan != "free" else "none",
        stripe_subscription_id=user.stripe_subscription_id,
    )

    if user.stripe_subscription_id and settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            sub = stripe.Subscription.retrieve(user.stripe_subscription_id)
            result.status = sub.status
            result.current_period_end = sub.current_period_end
            result.cancel_at_period_end = sub.cancel_at_period_end
        except stripe.StripeError:
            pass

    return result


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


@router.post("/webhooks", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle Stripe webhook events."""
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        return {"status": "ok"}

    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.SignatureVerificationError) as e:
        logger.warning("Stripe webhook signature verification failed: {}", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe webhook received: type={}", event_type)

    if event_type == "checkout.session.completed":
        user_id = data.get("metadata", {}).get("user_id")
        subscription_id = data.get("subscription")
        if user_id and subscription_id:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.plan = "pro"
                user.stripe_subscription_id = subscription_id
                if user.team_id:
                    team_result = await db.execute(
                        select(Team).where(Team.id == user.team_id)
                    )
                    team = team_result.scalar_one_or_none()
                    if team:
                        team.plan = "pro"
                        team.max_members = 50
                        team.max_chunks = 100000
                await db.flush()
                logger.info("User upgraded to pro: user_id={}", user_id)

    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")
        if subscription_id:
            result = await db.execute(
                select(User).where(User.stripe_subscription_id == subscription_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.plan = "free"
                user.stripe_subscription_id = None
                if user.team_id:
                    team_result = await db.execute(
                        select(Team).where(Team.id == user.team_id)
                    )
                    team = team_result.scalar_one_or_none()
                    if team:
                        team.plan = "free"
                        team.max_members = 5
                        team.max_chunks = 10000
                await db.flush()
                logger.info("Subscription canceled for user with sub_id={}", subscription_id)

    elif event_type in (
        "invoice.paid",
        "invoice.payment_failed",
        "customer.subscription.updated",
    ):
        customer_id = data.get("customer")
        if customer_id:
            result = await db.execute(
                select(User).where(User.stripe_customer_id == customer_id)
            )
            user = result.scalar_one_or_none()
            if user:
                billing_event = BillingEvent(
                    user_id=user.id,
                    team_id=user.team_id,
                    event_type=event_type,
                    stripe_event_id=event["id"],
                    stripe_subscription_id=data.get("subscription"),
                    stripe_invoice_id=data.get("id") if "invoice" in event_type else None,
                    amount=(data.get("amount_paid", 0) or 0) / 100.0 if "invoice" in event_type else None,
                    currency=data.get("currency", "usd"),
                    status=data.get("status", "unknown"),
                )
                db.add(billing_event)
                await db.flush()

    return {"status": "ok"}
