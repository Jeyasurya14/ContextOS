# backend/app/api/routes/billing.py

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import stripe

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.get("/plans")
async def get_plans() -> dict:
    """Return plan details. Public endpoint, no auth required."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "currency": "USD",
                "interval": "month",
                "features": [
                    "50 queries per day",
                    "1 GitHub repo",
                    "Community support"
                ],
                "limits": {"queries_per_day": 50, "repos": 1, "team_members": 0}
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 20,
                "currency": "USD",
                "interval": "month",
                "stripe_price_id": settings.STRIPE_PRO_PRICE_ID,
                "features": [
                    "500 queries per day",
                    "Unlimited repos",
                    "100K context chunks",
                    "GitHub + Notion + Slack",
                    "VS Code extension",
                    "Priority support"
                ],
                "limits": {"queries_per_day": 500, "repos": -1, "team_members": 0}
            },
            {
                "id": "team",
                "name": "Team",
                "price": 99,
                "currency": "USD",
                "interval": "month",
                "stripe_price_id": settings.STRIPE_TEAM_PRICE_ID,
                "features": [
                    "2000 queries per day",
                    "Unlimited everything",
                    "Team shared context",
                    "Up to 20 members",
                    "Dedicated support"
                ],
                "limits": {"queries_per_day": 2000, "repos": -1, "team_members": 20}
            }
        ]
    }


@router.post("/create-checkout-session")
async def create_checkout_session(
    plan: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create Stripe checkout session."""
    if plan not in ["pro", "team"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan",
        )
    
    if user.stripe_customer_id:
        customer = stripe.Customer.retrieve(user.stripe_customer_id)
    else:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name,
            metadata={"user_id": str(user.id)}
        )
        user.stripe_customer_id = customer.id
        await db.commit()
    
    price_id = (
        settings.STRIPE_PRO_PRICE_ID if plan == "pro"
        else settings.STRIPE_TEAM_PRICE_ID
    )
    
    session = stripe.checkout.Session.create(
        customer=customer.id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/dashboard/billing?success=true&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/dashboard/billing?cancelled=true",
        metadata={"user_id": str(user.id), "plan": plan},
        allow_promotion_codes=True,
    )
    
    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/portal")
async def create_portal_session(
    user: User = Depends(get_current_user),
) -> dict:
    """Create Stripe customer portal session."""
    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer found",
        )
    
    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/dashboard/billing",
    )
    
    return {"portal_url": session.url}


@router.get("/subscription")
async def get_subscription(
    user: User = Depends(get_current_user),
) -> dict:
    """Get current subscription details."""
    result = {
        "plan": user.plan,
        "status": user.subscription_status or "active",
        "stripe_subscription_id": user.stripe_subscription_id,
        "period_end": user.subscription_period_end.isoformat() if user.subscription_period_end else None,
        "cancel_at_period_end": False,
    }
    
    if user.stripe_subscription_id:
        try:
            subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
            result["cancel_at_period_end"] = subscription.cancel_at_period_end
        except Exception:
            pass
    
    return result


@router.get("/usage")
async def get_usage(
    user: User = Depends(get_current_user),
) -> dict:
    """Get current usage for the user."""
    limits = {
        "free": {"queries_per_day": 50},
        "pro": {"queries_per_day": 500},
        "team": {"queries_per_day": 2000},
    }
    
    limit = limits.get(user.plan, limits["free"])["queries_per_day"]
    
    return {
        "queries_count": user.query_count_today,
        "queries_limit": limit,
        "date": datetime.utcnow().date().isoformat(),
        "plan": user.plan,
    }


@router.post("/webhooks/stripe")
async def stripe_webhook(
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
