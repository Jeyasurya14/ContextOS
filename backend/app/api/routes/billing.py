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

router = APIRouter(tags=["billing"])

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


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event["type"]
    
    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"]["user_id"]
        plan = session["metadata"]["plan"]
        subscription_id = session["subscription"]
        
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user:
            user.plan = plan
            user.stripe_subscription_id = subscription_id
            user.stripe_price_id = subscription["items"]["data"][0]["price"]["id"]
            user.subscription_status = subscription["status"]
            user.subscription_period_end = datetime.fromtimestamp(
                subscription["current_period_end"]
            )
            await db.commit()
            logger.info(f"Subscription activated: user_id={user_id} plan={plan}")
    
    elif event_type == "customer.subscription.updated":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        
        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.subscription_status = subscription["status"]
            user.subscription_period_end = datetime.fromtimestamp(
                subscription["current_period_end"]
            )
            if subscription.get("cancel_at_period_end"):
                user.subscription_status = "cancelling"
            await db.commit()
    
    elif event_type == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        
        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.plan = "free"
            user.stripe_subscription_id = None
            user.stripe_price_id = None
            user.subscription_status = None
            user.subscription_period_end = None
            await db.commit()
            logger.info(f"Subscription cancelled: user_id={user.id}")
    
    elif event_type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice["customer"]
        
        result = await db.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.subscription_status = "past_due"
            await db.commit()
            logger.warning(f"Payment failed: user_id={user.id}")
    
    return {"status": "ok"}
