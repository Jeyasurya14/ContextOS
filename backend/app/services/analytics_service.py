"""Analytics service for generating usage insights."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models import (
    User, Conversation, ConversationMessage, Prompt,
    Project, Integration, Activity
)


async def get_conversation_analytics(
    db: AsyncSession,
    user: User,
    days: int = 30
) -> dict:
    """Get conversation analytics for the user."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Total conversations
    total_stmt = select(func.count(Conversation.id)).where(
        and_(
            Conversation.user_id == user.id,
            Conversation.created_at >= start_date
        )
    )
    total_conversations = (await db.execute(total_stmt)).scalar_one()

    # Total messages
    msg_stmt = (
        select(func.count(ConversationMessage.id))
        .join(Conversation)
        .where(
            and_(
                Conversation.user_id == user.id,
                ConversationMessage.created_at >= start_date
            )
        )
    )
    total_messages = (await db.execute(msg_stmt)).scalar_one()

    # Messages by day (last 30 days)
    daily_stmt = (
        select(
            func.date(ConversationMessage.created_at).label("date"),
            func.count(ConversationMessage.id).label("count")
        )
        .join(Conversation)
        .where(
            and_(
                Conversation.user_id == user.id,
                ConversationMessage.created_at >= start_date
            )
        )
        .group_by(func.date(ConversationMessage.created_at))
        .order_by(func.date(ConversationMessage.created_at))
    )
    daily_results = (await db.execute(daily_stmt)).all()
    messages_by_day = [
        {"date": str(row.date), "count": row.count}
        for row in daily_results
    ]

    # Average messages per conversation
    avg_messages = total_messages / total_conversations if total_conversations > 0 else 0

    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "avg_messages_per_conversation": round(avg_messages, 1),
        "messages_by_day": messages_by_day,
        "period_days": days,
    }


async def get_integration_analytics(
    db: AsyncSession,
    user: User
) -> dict:
    """Get integration usage analytics."""
    # Integration stats
    int_stmt = (
        select(
            Integration.provider,
            func.count(Integration.id).label("count"),
            func.sum(Integration.total_chunks).label("total_chunks"),
            func.count(func.nullif(Integration.is_active, False)).label("active_count")
        )
        .where(Integration.user_id == user.id)
        .group_by(Integration.provider)
    )
    int_results = (await db.execute(int_stmt)).all()

    integrations_by_provider = [
        {
            "provider": row.provider,
            "count": row.count,
            "total_chunks": row.total_chunks or 0,
            "active_count": row.active_count or 0,
        }
        for row in int_results
    ]

    # Total chunks across all integrations
    total_chunks_stmt = select(func.sum(Integration.total_chunks)).where(
        Integration.user_id == user.id
    )
    total_chunks = (await db.execute(total_chunks_stmt)).scalar_one() or 0

    return {
        "integrations_by_provider": integrations_by_provider,
        "total_chunks": total_chunks,
    }


async def get_prompt_analytics(
    db: AsyncSession,
    user: User
) -> dict:
    """Get prompt usage analytics."""
    # Total prompts
    total_stmt = select(func.count(Prompt.id)).where(
        Prompt.user_id == user.id
    )
    total_prompts = (await db.execute(total_stmt)).scalar_one()

    # Prompts by scope
    scope_stmt = (
        select(
            Prompt.scope,
            func.count(Prompt.id).label("count")
        )
        .where(Prompt.user_id == user.id)
        .group_by(Prompt.scope)
    )
    scope_results = (await db.execute(scope_stmt)).all()
    prompts_by_scope = {row.scope: row.count for row in scope_results}

    # Most used prompts
    most_used_stmt = (
        select(Prompt)
        .where(Prompt.user_id == user.id)
        .order_by(Prompt.usage_count.desc())
        .limit(10)
    )
    most_used = (await db.execute(most_used_stmt)).scalars().all()
    most_used_prompts = [
        {
            "id": p.id,
            "title": p.title,
            "usage_count": p.usage_count,
            "scope": p.scope,
        }
        for p in most_used
    ]

    return {
        "total_prompts": total_prompts,
        "prompts_by_scope": prompts_by_scope,
        "most_used_prompts": most_used_prompts,
    }


async def get_activity_timeline(
    db: AsyncSession,
    user: User,
    days: int = 7
) -> list[dict]:
    """Get recent activity timeline."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = (
        select(Activity)
        .where(
            and_(
                Activity.user_id == user.id,
                Activity.created_at >= start_date
            )
        )
        .order_by(Activity.created_at.desc())
        .limit(50)
    )
    activities = (await db.execute(stmt)).scalars().all()

    return [
        {
            "id": a.id,
            "activity_type": a.activity_type,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "extra_data": a.extra_data,
            "created_at": a.created_at.isoformat(),
        }
        for a in activities
    ]


async def get_overview_stats(
    db: AsyncSession,
    user: User
) -> dict:
    """Get high-level overview statistics."""
    # Count queries
    counts = await db.execute(
        select(
            func.count(Conversation.id).label("conversations"),
            func.count(Prompt.id).label("prompts"),
            func.count(Project.id).label("projects"),
            func.count(Integration.id).label("integrations"),
        )
        .select_from(User)
        .outerjoin(Conversation, Conversation.user_id == User.id)
        .outerjoin(Prompt, Prompt.user_id == User.id)
        .outerjoin(Project, Project.user_id == User.id)
        .outerjoin(Integration, Integration.user_id == User.id)
        .where(User.id == user.id)
    )
    row = counts.one()

    return {
        "total_conversations": row.conversations or 0,
        "total_prompts": row.prompts or 0,
        "total_projects": row.projects or 0,
        "total_integrations": row.integrations or 0,
    }
