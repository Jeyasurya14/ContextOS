# backend/app/services/billing_service.py
#
# RAZORPAY SETUP:
# 1. Go to razorpay.com → Sign up
# 2. Dashboard → Settings → API Keys → Generate Test Key
#    Copy Key ID → RAZORPAY_KEY_ID
#    Copy Key Secret → RAZORPAY_KEY_SECRET
# 3. Dashboard → Subscriptions → Plans → Create Plan
#    Pro Plan:  ₹1,667/month → copy Plan ID → RAZORPAY_PRO_PLAN_ID
#    Team Plan: ₹8,282/month → copy Plan ID → RAZORPAY_TEAM_PLAN_ID
# 4. Dashboard → Settings → Webhooks → Add Webhook
#    URL: https://your-domain/api/v1/webhooks/razorpay
#    Secret: any random string → RAZORPAY_WEBHOOK_SECRET
#    Events: payment.captured, payment.failed, subscription.cancelled
# 5. Test card: 4111 1111 1111 1111 | any future date | any CVV
#    UPI test: success@razorpay

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.config import settings
from app.models.user import User
from app.models.team import Team
from app.models.billing import BillingEvent, UsageRecord

try:
    import razorpay
except ModuleNotFoundError as exc:
    razorpay = None
    _razorpay_import_error = exc
else:
    _razorpay_import_error = None


PLAN_LIMITS = {
    "free": {
        "queries_per_day": 50,
        "max_chunks": 10000,
        "max_integrations": 3,
        "max_team_members": 5,
    },
    "pro": {
        "queries_per_day": 999999,
        "max_chunks": 100000,
        "max_integrations": 999,
        "max_team_members": 50,
    },
    "team": {
        "queries_per_day": 999999,
        "max_chunks": 999999,
        "max_integrations": 999,
        "max_team_members": 999,
    },
}

PLAN_PRICES_PAISE = {
    "pro": 166700,
    "team": 828200,
}


class BillingService:
    """Service for managing Razorpay billing, usage limits, and plan enforcement."""

    def __init__(self) -> None:
        """Initialize the billing service."""
        self._client: Any | None = None

    def ensure_billing_provider_available(self) -> None:
        """Raise a clear error if Razorpay or one of its dependencies is unavailable."""
        if razorpay is None:
            missing_dependency = _razorpay_import_error.name if _razorpay_import_error else "razorpay"
            raise RuntimeError(
                "Razorpay billing is unavailable because a required dependency could not be imported: "
                f"{missing_dependency}. Install backend dependencies including setuptools."
            ) from _razorpay_import_error

    @property
    def client(self) -> Any:
        """Lazy-initialize the Razorpay client."""
        self.ensure_billing_provider_available()
        assert razorpay is not None
        if self._client is None:
            self._client = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )
        return self._client

    def get_plan_limits(self, plan: str) -> dict:
        """Get the limits for a given plan."""
        return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    def create_order(self, user_id: str, plan: str) -> dict:
        """Create a Razorpay order for the given plan.

        Args:
            user_id: The authenticated user's ID.
            plan: The plan to purchase ('pro' or 'team').

        Returns:
            Dict with order_id, amount, currency, razorpay_key_id.
        """
        amount = PLAN_PRICES_PAISE.get(plan)
        if amount is None:
            raise ValueError(f"Invalid plan: {plan}")

        order_data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"order_{user_id}_{plan}",
            "notes": {"user_id": str(user_id), "plan": plan},
        }
        order = self.client.order.create(data=order_data)
        logger.info("Razorpay order created: order_id={} user_id={} plan={}", order["id"], user_id, plan)

        return {
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        }

    def verify_payment(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """Verify a Razorpay payment signature.

        Args:
            razorpay_order_id: The order ID from Razorpay.
            razorpay_payment_id: The payment ID from Razorpay.
            razorpay_signature: The signature from Razorpay.

        Returns:
            True if signature is valid, False otherwise.
        """
        self.ensure_billing_provider_available()
        assert razorpay is not None
        try:
            self.client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            })
            return True
        except razorpay.errors.SignatureVerificationError:
            logger.warning("Razorpay signature verification failed: order_id={}", razorpay_order_id)
            return False

    async def activate_subscription(
        self,
        user_id: str,
        plan: str,
        payment_id: str,
        db: AsyncSession,
    ) -> User | None:
        """Activate a subscription after successful payment.

        Args:
            user_id: The user's ID.
            plan: The plan to activate ('pro' or 'team').
            payment_id: The Razorpay payment ID.
            db: Active async database session.

        Returns:
            The updated User or None if user not found.
        """
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            logger.error("activate_subscription: user not found user_id={}", user_id)
            return None

        user.plan = plan
        user.razorpay_subscription_id = payment_id

        if user.team_id:
            team_result = await db.execute(select(Team).where(Team.id == user.team_id))
            team = team_result.scalar_one_or_none()
            if team:
                limits = self.get_plan_limits(plan)
                team.plan = plan
                team.max_members = limits["max_team_members"]
                team.max_chunks = limits["max_chunks"]

        await db.flush()
        logger.info("Subscription activated: user_id={} plan={} payment_id={}", user_id, plan, payment_id)
        return user

    async def get_subscription(self, user_id: str, db: AsyncSession) -> dict:
        """Get current subscription details for a user.

        Args:
            user_id: The user's ID.
            db: Active async database session.

        Returns:
            Dict with plan, status, razorpay_subscription_id.
        """
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            return {"plan": "free", "status": "none", "razorpay_subscription_id": None}

        return {
            "plan": user.plan,
            "status": "active" if user.plan != "free" else "none",
            "razorpay_subscription_id": user.razorpay_subscription_id,
        }

    async def check_query_limit(self, user: User, db: AsyncSession) -> bool:
        """Check if user has remaining queries today. Returns True if allowed."""
        limits = self.get_plan_limits(user.plan)
        now = datetime.now(timezone.utc)

        if user.query_count_reset_at.date() < now.date():
            user.query_count_today = 0
            user.query_count_reset_at = now
            await db.flush()

        if user.query_count_today >= limits["queries_per_day"]:
            logger.info(
                "Query limit reached: user_id={} plan={} count={}",
                user.id, user.plan, user.query_count_today,
            )
            return False
        return True

    async def increment_query_count(self, user: User, db: AsyncSession) -> int:
        """Increment the user's daily query count. Returns new count."""
        user.query_count_today += 1
        await db.flush()

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        result = await db.execute(
            select(UsageRecord).where(
                UsageRecord.user_id == user.id,
                UsageRecord.date == today,
            )
        )
        record = result.scalar_one_or_none()
        if record:
            record.query_count += 1
        else:
            record = UsageRecord(
                user_id=user.id,
                date=today,
                query_count=1,
            )
            db.add(record)
        await db.flush()

        return user.query_count_today

    async def check_chunk_limit(self, user: User) -> bool:
        """Check if user can add more context chunks."""
        limits = self.get_plan_limits(user.plan)
        total = sum(i.total_chunks for i in user.integrations) if user.integrations else 0
        return total < limits["max_chunks"]

    async def check_integration_limit(self, user: User) -> bool:
        """Check if user can add more integrations."""
        limits = self.get_plan_limits(user.plan)
        active = sum(1 for i in user.integrations if i.is_active) if user.integrations else 0
        return active < limits["max_integrations"]

    def get_upgrade_message(self, user: User) -> str:
        """Get the upgrade message for a rate-limited user."""
        if user.plan == "free":
            return (
                "You've reached the free plan limit of 50 queries/day. "
                "Upgrade to Pro (₹1,667/month) for unlimited queries."
            )
        return "Rate limit reached. Please try again later."

    async def handle_webhook_event(
        self,
        event_type: str,
        payload: dict,
        db: AsyncSession,
    ) -> None:
        """Handle a Razorpay webhook event.

        Args:
            event_type: The Razorpay event type string.
            payload: The full event payload dict.
            db: Active async database session.
        """
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment_entity.get("notes", {})
        user_id = notes.get("user_id")
        plan = notes.get("plan")
        payment_id = payment_entity.get("id", "")
        order_id = payment_entity.get("order_id", "")

        if event_type == "payment.captured" and user_id and plan:
            await self.activate_subscription(user_id, plan, payment_id, db)
            billing_event = BillingEvent(
                user_id=user_id,
                event_type=event_type,
                razorpay_event_id=payload.get("event", f"evt_{payment_id}"),
                razorpay_payment_id=payment_id,
                razorpay_order_id=order_id,
                amount=(payment_entity.get("amount", 0) or 0) / 100.0,
                currency="inr",
                status="captured",
            )
            db.add(billing_event)
            await db.flush()

        elif event_type == "payment.failed":
            if user_id:
                billing_event = BillingEvent(
                    user_id=user_id,
                    event_type=event_type,
                    razorpay_event_id=payload.get("event", f"evt_{payment_id}"),
                    razorpay_payment_id=payment_id,
                    razorpay_order_id=order_id,
                    amount=(payment_entity.get("amount", 0) or 0) / 100.0,
                    currency="inr",
                    status="failed",
                )
                db.add(billing_event)
                await db.flush()
            logger.warning("Payment failed: payment_id={} user_id={}", payment_id, user_id)

        elif event_type == "subscription.cancelled":
            sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
            sub_notes = sub_entity.get("notes", {})
            sub_user_id = sub_notes.get("user_id")
            if sub_user_id:
                result = await db.execute(select(User).where(User.id == sub_user_id))
                user = result.scalar_one_or_none()
                if user:
                    user.plan = "free"
                    user.razorpay_subscription_id = None
                    if user.team_id:
                        team_result = await db.execute(select(Team).where(Team.id == user.team_id))
                        team = team_result.scalar_one_or_none()
                        if team:
                            team.plan = "free"
                            team.max_members = 5
                            team.max_chunks = 10000
                    await db.flush()
                    logger.info("Subscription cancelled: user_id={}", sub_user_id)

        else:
            logger.info("Unhandled Razorpay webhook event: {}", event_type)


billing_service = BillingService()
