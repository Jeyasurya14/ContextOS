"""Global search endpoints for command palette."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User, Conversation, Prompt, Project, Integration

router = APIRouter(tags=["search"])


@router.get("/global")
async def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Global search across conversations, prompts, projects, and integrations.
    Returns aggregated results for command palette.
    """
    query = q.lower().strip()
    results = {
        "conversations": [],
        "prompts": [],
        "projects": [],
        "integrations": [],
        "actions": _get_quick_actions(query),
    }

    # Search conversations
    conv_stmt = (
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .where(
            or_(
                func.lower(Conversation.title).contains(query),
            )
        )
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
    )
    convs = (await db.execute(conv_stmt)).scalars().all()
    results["conversations"] = [
        {
            "id": c.id,
            "title": c.title,
            "type": "conversation",
            "updated_at": c.updated_at.isoformat(),
            "message_count": c.message_count,
        }
        for c in convs
    ]

    # Search prompts
    prompt_stmt = (
        select(Prompt)
        .where(
            or_(
                Prompt.user_id == user.id,
                Prompt.scope == "team",
            )
        )
        .where(
            or_(
                func.lower(Prompt.title).contains(query),
                func.lower(Prompt.body).contains(query),
                func.lower(Prompt.description).contains(query) if Prompt.description else False,
            )
        )
        .order_by(Prompt.updated_at.desc())
        .limit(limit)
    )
    prompts = (await db.execute(prompt_stmt)).scalars().all()
    results["prompts"] = [
        {
            "id": p.id,
            "title": p.title,
            "type": "prompt",
            "scope": p.scope,
            "description": p.description,
        }
        for p in prompts
    ]

    # Search projects
    proj_stmt = (
        select(Project)
        .where(Project.user_id == user.id)
        .where(func.lower(Project.name).contains(query))
        .order_by(Project.updated_at.desc())
        .limit(limit)
    )
    projects = (await db.execute(proj_stmt)).scalars().all()
    results["projects"] = [
        {
            "id": p.id,
            "name": p.name,
            "type": "project",
            "total_chunks": p.total_chunks,
            "is_active": p.is_active,
        }
        for p in projects
    ]

    # Search integrations
    int_stmt = (
        select(Integration)
        .where(Integration.user_id == user.id)
        .where(func.lower(Integration.provider).contains(query))
        .order_by(Integration.updated_at.desc())
        .limit(limit)
    )
    integrations = (await db.execute(int_stmt)).scalars().all()
    results["integrations"] = [
        {
            "id": i.id,
            "provider": i.provider,
            "type": "integration",
            "is_active": i.is_active,
            "total_chunks": i.total_chunks,
        }
        for i in integrations
    ]

    return results


def _get_quick_actions(query: str) -> list[dict]:
    """Return quick actions based on query."""
    actions = [
        {
            "id": "new_chat",
            "title": "Start new chat",
            "icon": "MessageSquare",
            "action": "/dashboard/chat",
        },
        {
            "id": "new_prompt",
            "title": "Create prompt",
            "icon": "Sparkles",
            "action": "/dashboard/prompts?new=true",
        },
        {
            "id": "new_project",
            "title": "Create project",
            "icon": "FolderPlus",
            "action": "/dashboard/projects?new=true",
        },
        {
            "id": "add_integration",
            "title": "Add integration",
            "icon": "Plug",
            "action": "/dashboard/integrations",
        },
        {
            "id": "view_analytics",
            "title": "View analytics",
            "icon": "BarChart",
            "action": "/dashboard/analytics",
        },
        {
            "id": "team_settings",
            "title": "Team settings",
            "icon": "Users",
            "action": "/dashboard/team",
        },
        {
            "id": "billing",
            "title": "Billing & usage",
            "icon": "CreditCard",
            "action": "/dashboard/billing",
        },
        {
            "id": "settings",
            "title": "Settings",
            "icon": "Settings",
            "action": "/dashboard/settings",
        },
    ]

    # Filter actions by query
    if query:
        actions = [
            a for a in actions
            if query in a["title"].lower() or query in a["id"].lower()
        ]

    return actions[:5]  # Limit to 5 actions
