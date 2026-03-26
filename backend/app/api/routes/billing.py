# backend/app/api/routes/billing.py

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import hmac
import hashlib
import json

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.api.deps import get_current_user
from app.services.billing_service import billing_service
from app.schemas.billing import OrderCreate, OrderResponse, PaymentVerify, PaymentVerifyResponse

router = APIRouter(tags=["billing"])


@router.get("/plans")
async def get_plans() -> dict:
    """Return plan details. Public endpoint, no auth required."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price_inr": 0,
                "price_display": "₹0/mo",
                "features": [
                    "25 queries per day",
                    "3 integrations",
                    "10K context chunks",
                    "VS Code extension",
                    "Community support"
                ],
                "limits": {"queries_per_day": 25, "repos": 3, "team_members": 5}
            },
            {
                "id": "pro",
                "name": "Pro",
                "price_inr": 99900,
                "price_display": "₹999/mo",
                "features": [
                    "Unlimited queries",
                    "Unlimited integrations",
                    "100K context chunks",
                    "Real-time webhook sync",
                    "Team shared context",
                    "Priority support"
                ],
                "limits": {"queries_per_day": -1, "repos": -1, "team_members": 50}
            },
            {
                "id": "team",
                "name": "Team",
                "price_inr": 299900,
                "price_display": "₹2,999/mo",
                "features": [
                    "Everything in Pro",
                    "Unlimited team members",
                    "Unlimited context chunks",
                    "SSO & SAML",
                    "Dedicated support",
                    "Custom SLA"
                ],
                "limits": {"queries_per_day": -1, "repos": -1, "team_members": -1}
            }
        ]
    }


@router.get("/subscription")
async def get_subscription(
    user: User = Depends(get_current_user),
) -> dict:
    """Get current subscription details."""
    return {
        "plan": user.plan,
        "status": user.subscription_status or "active",
        "razorpay_subscription_id": user.razorpay_subscription_id,
        "period_end": user.subscription_period_end.isoformat() if user.subscription_period_end else None,
    }


@router.get("/usage")
async def get_usage(
    user: User = Depends(get_current_user),
) -> dict:
    """Get current usage for the user."""
    limits = {
        "free": {"queries_per_day": 25},
        "pro": {"queries_per_day": -1},
        "team": {"queries_per_day": -1},
    }
    
    limit = limits.get(user.plan, limits["free"])["queries_per_day"]
    
    return {
        "queries_count": user.query_count_today,
        "queries_limit": limit,
        "date": datetime.utcnow().date().isoformat(),
        "plan": user.plan,
    }


@router.post("/create-order")
async def create_order(
    order_data: OrderCreate,
    user: User = Depends(get_current_user),
) -> OrderResponse:
    """Create Razorpay order for the given plan."""
    try:
        order = billing_service.create_order(str(user.id), order_data.plan)
        return OrderResponse(**order, plan=order_data.plan)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error(f"Billing provider unavailable while creating order: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to create order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order",
        )


@router.post("/verify-payment")
async def verify_payment(
    payment_data: PaymentVerify,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentVerifyResponse:
    """Verify Razorpay payment and activate subscription."""
    try:
        is_valid = billing_service.verify_payment(
            payment_data.razorpay_order_id,
            payment_data.razorpay_payment_id,
            payment_data.razorpay_signature,
        )
    except RuntimeError as e:
        logger.error(f"Billing provider unavailable while verifying payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature",
        )
    
    updated_user = await billing_service.activate_subscription(
        str(user.id),
        payment_data.plan,
        payment_data.razorpay_payment_id,
        db,
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    await db.commit()
    
    return PaymentVerifyResponse(
        success=True,
        plan=payment_data.plan,
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Handle Razorpay webhook events."""
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    
    expected_signature = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected_signature, signature):
        logger.warning("Invalid Razorpay webhook signature")
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid signature"}
        )

    try:
        billing_service.ensure_billing_provider_available()
    except RuntimeError as e:
        logger.error(f"Billing provider unavailable while processing webhook: {e}")
        return JSONResponse(
            status_code=503,
            content={"error": str(e)}
        )
    
    try:
        payload = json.loads(body_bytes)
        event_type = payload.get("event", "")
        
        await billing_service.handle_webhook_event(event_type, payload, db)
        await db.commit()
        
        return JSONResponse(
            status_code=200,
            content={"status": "ok"}
        )
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        await db.rollback()
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )
