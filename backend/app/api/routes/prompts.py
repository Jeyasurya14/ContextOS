# backend/app/api/routes/prompts.py
#
# Saved prompt templates — personal or shared at the team level.
# Users can curate a library of reusable prompts, click to insert into Chat,
# and see which teammates have shared what.

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.models.user import User
from app.models.prompt import Prompt
from app.schemas.prompt import (
    PromptCreate,
    PromptUpdate,
    PromptResponse,
    PromptListResponse,
)
from app.api.deps import get_current_user

router = APIRouter(tags=["prompts"])


def _visible_filter(user: User):
    """Return a SQLAlchemy filter matching prompts the given user can see.

    A user can see:
      - Their own personal prompts
      - Any team-scoped prompts from any member of their team (if they have one)
    """
    clauses = [Prompt.user_id == user.id]
    if user.team_id:
        clauses.append(
            (Prompt.team_id == user.team_id) & (Prompt.scope == "team")
        )
    return or_(*clauses)


@router.get("", response_model=PromptListResponse)
async def list_prompts(
    scope: str | None = Query(default=None, description="Filter by 'personal' or 'team'"),
    q: str | None = Query(default=None, description="Search by title/body/tags"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromptListResponse:
    """List every prompt visible to the current user."""
    base = select(Prompt).where(_visible_filter(user))
    if scope in ("personal", "team"):
        base = base.where(Prompt.scope == scope)
    if q:
        needle = f"%{q.lower()}%"
        base = base.where(
            or_(
                func.lower(Prompt.title).like(needle),
                func.lower(Prompt.body).like(needle),
                func.lower(Prompt.description).like(needle),
            )
        )

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    rows = (
        await db.execute(
            base.order_by(Prompt.updated_at.desc()).offset(skip).limit(limit)
        )
    ).scalars().all()

    return PromptListResponse(
        prompts=[PromptResponse.model_validate(p) for p in rows],
        total=total,
    )


@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    data: PromptCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromptResponse:
    """Create a new prompt. Team scope is only allowed if the user has a team."""
    scope = data.scope
    if scope == "team" and not user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You need to be on a team to create team-scoped prompts.",
        )

    prompt = Prompt(
        user_id=user.id,
        team_id=user.team_id if scope == "team" else None,
        title=data.title.strip(),
        body=data.body,
        description=(data.description or None),
        scope=scope,
        tags=[t.strip() for t in (data.tags or []) if t.strip()],
    )
    db.add(prompt)
    await db.flush()

    logger.info("Prompt created: id={} user_id={} scope={}", prompt.id, user.id, scope)
    return PromptResponse.model_validate(prompt)


async def _get_owned_or_team_prompt(
    prompt_id: str, user: User, db: AsyncSession, *, require_owner: bool = False
) -> Prompt:
    result = await db.execute(select(Prompt).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")

    is_owner = prompt.user_id == user.id
    is_teammate = (
        prompt.scope == "team"
        and user.team_id is not None
        and prompt.team_id == user.team_id
    )
    if not (is_owner or is_teammate):
        raise HTTPException(status_code=404, detail="Prompt not found")

    if require_owner and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the prompt's creator can modify or delete it.",
        )
    return prompt


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromptResponse:
    prompt = await _get_owned_or_team_prompt(prompt_id, user, db)
    return PromptResponse.model_validate(prompt)


@router.patch("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: str,
    data: PromptUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromptResponse:
    prompt = await _get_owned_or_team_prompt(prompt_id, user, db, require_owner=True)

    updates = data.model_dump(exclude_unset=True)

    # Scope handling: switching to team requires being on a team
    if "scope" in updates:
        new_scope = updates["scope"]
        if new_scope == "team" and not user.team_id:
            raise HTTPException(
                status_code=400,
                detail="You need to be on a team to share a prompt with the team.",
            )
        prompt.scope = new_scope
        prompt.team_id = user.team_id if new_scope == "team" else None

    if "title" in updates and updates["title"] is not None:
        prompt.title = updates["title"].strip()
    if "body" in updates and updates["body"] is not None:
        prompt.body = updates["body"]
    if "description" in updates:
        prompt.description = updates["description"] or None
    if "tags" in updates and updates["tags"] is not None:
        prompt.tags = [t.strip() for t in updates["tags"] if t.strip()]

    await db.flush()
    return PromptResponse.model_validate(prompt)


@router.delete("/{prompt_id}", response_model=dict)
async def delete_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    prompt = await _get_owned_or_team_prompt(prompt_id, user, db, require_owner=True)
    await db.delete(prompt)
    await db.flush()
    return {"message": "Prompt deleted"}


@router.post("/{prompt_id}/use", response_model=PromptResponse)
async def record_use(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromptResponse:
    """Increment usage_count when a user inserts the prompt into chat.

    Visible to any teammate, not just the owner — helps surface popular prompts.
    """
    prompt = await _get_owned_or_team_prompt(prompt_id, user, db)
    prompt.usage_count = (prompt.usage_count or 0) + 1
    await db.flush()
    return PromptResponse.model_validate(prompt)


@router.post("/{prompt_id}/duplicate", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromptResponse:
    """Copy any visible prompt into the current user's personal library."""
    src = await _get_owned_or_team_prompt(prompt_id, user, db)

    copy = Prompt(
        user_id=user.id,
        team_id=None,
        title=f"{src.title} (copy)",
        body=src.body,
        description=src.description,
        scope="personal",
        tags=list(src.tags or []),
    )
    db.add(copy)
    await db.flush()
    return PromptResponse.model_validate(copy)
