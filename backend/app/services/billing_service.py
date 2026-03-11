# backend/app/services/billing_service.py

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.config import settings
from app.models.user import User
from app.models.billing import UsageRecord


PLAN_LIMITS = {
    "free": {
        "queries_per_day": 50,
        "max_chunks": 10000,
        "max_integrations": 3,
        "max_team_members": 5,
    },
    "pro": {
        "queries_per_day": 1000,
        "max_chunks": 100000,
        "max_integrations": 999,
        "max_team_members": 50,
    },
    "enterprise": {
        "queries_per_day": 999999,
        "max_chunks": 999999,
        "max_integrations": 999,
        "max_team_members": 999,
    },
}


class BillingService:
    """Service for managing billing, usage limits, and plan enforcement."""

    def get_plan_limits(self, plan: str) -> dict:
        """Get the limits for a given plan."""
        return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

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
                "Upgrade to Pro for 1,000 queries/day."
            )
        if user.plan == "pro":
            return (
                "You've reached the Pro plan limit of 1,000 queries/day. "
                "Contact sales for Enterprise."
            )
        return "Rate limit reached. Please try again later."


billing_service = BillingService()
