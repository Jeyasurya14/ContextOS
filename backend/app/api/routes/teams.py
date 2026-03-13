# backend/app/api/routes/teams.py

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.team import Team, TeamInvitation
from app.schemas.team import (
    TeamCreate,
    TeamUpdate,
    TeamResponse,
    TeamMemberResponse,
    InviteCreate,
    InvitationResponse,
    InviteAccept,
)
from app.schemas.auth import MessageResponse
from app.api.deps import get_current_user

router = APIRouter(tags=["teams"])


def _slugify(name: str) -> str:
    """Convert a team name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = "".join(c if c.isalnum() or c == " " else "" for c in slug)
    slug = slug.replace(" ", "-")
    slug = "-".join(part for part in slug.split("-") if part)
    return slug[:100] or "team"


async def _get_member_count(team_id: str, db: AsyncSession) -> int:
    """Count members in a team."""
    result = await db.execute(
        select(func.count()).where(User.team_id == team_id)
    )
    return result.scalar_one()


async def _require_team_admin(user: User, db: AsyncSession) -> Team:
    """Require user to be team owner or admin."""
    if not user.team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of any team",
        )
    result = await db.execute(select(Team).where(Team.id == user.team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    if user.team_role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or owner role required",
        )
    return team


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    body: TeamCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Create a new team. User becomes the owner."""
    if user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of a team. Leave first.",
        )

    base_slug = _slugify(body.name)
    slug = base_slug
    suffix = 0
    while True:
        existing = await db.execute(select(Team).where(Team.slug == slug))
        if not existing.scalar_one_or_none():
            break
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    team = Team(
        name=body.name,
        slug=slug,
        owner_id=user.id,
        plan=user.plan,
        max_members=5 if user.plan == "free" else 50,
        max_chunks=10000 if user.plan == "free" else 100000,
    )
    db.add(team)
    await db.flush()

    user.team_id = team.id
    user.team_role = "owner"
    await db.flush()

    logger.info("Team created: team_id={} by user_id={}", team.id, user.id)
    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        owner_id=team.owner_id,
        plan=team.plan,
        max_members=team.max_members,
        max_chunks=team.max_chunks,
        total_chunks=team.total_chunks,
        is_active=team.is_active,
        member_count=1,
        created_at=team.created_at,
        updated_at=team.updated_at,
    )


@router.get("/me", response_model=TeamResponse)
async def get_my_team(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Get the current user's team."""
    if not user.team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of any team",
        )
    result = await db.execute(select(Team).where(Team.id == user.team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    count = await _get_member_count(team.id, db)
    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        owner_id=team.owner_id,
        plan=team.plan,
        max_members=team.max_members,
        max_chunks=team.max_chunks,
        total_chunks=team.total_chunks,
        is_active=team.is_active,
        member_count=count,
        created_at=team.created_at,
        updated_at=team.updated_at,
    )


@router.patch("/me", response_model=TeamResponse)
async def update_team(
    body: TeamUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Update the current team (admin/owner only)."""
    team = await _require_team_admin(user, db)
    if body.name is not None:
        team.name = body.name
    await db.flush()
    count = await _get_member_count(team.id, db)
    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        owner_id=team.owner_id,
        plan=team.plan,
        max_members=team.max_members,
        max_chunks=team.max_chunks,
        total_chunks=team.total_chunks,
        is_active=team.is_active,
        member_count=count,
        created_at=team.created_at,
        updated_at=team.updated_at,
    )


@router.get("/me/members", response_model=list[TeamMemberResponse])
async def list_members(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TeamMemberResponse]:
    """List all members of the current team."""
    if not user.team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of any team",
        )
    result = await db.execute(
        select(User).where(User.team_id == user.team_id)
    )
    members = result.scalars().all()
    return [
        TeamMemberResponse(
            id=m.id,
            email=m.email,
            full_name=m.full_name,
            team_role=m.team_role,
            created_at=m.created_at,
        )
        for m in members
    ]


@router.post("/{team_id}/invite", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    team_id: str,
    body: InviteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvitationResponse:
    """Invite a user to the team (admin/owner only)."""
    team = await _require_team_admin(user, db)
    if team.id != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only invite to your own team",
        )

    count = await _get_member_count(team.id, db)
    if count >= team.max_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team has reached the maximum of {team.max_members} members",
        )

    existing = await db.execute(
        select(User).where(User.email == body.email, User.team_id == team.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team",
        )

    pending = await db.execute(
        select(TeamInvitation).where(
            TeamInvitation.team_id == team.id,
            TeamInvitation.email == body.email,
            TeamInvitation.status == "pending",
        )
    )
    if pending.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An invitation is already pending for this email",
        )

    token = secrets.token_urlsafe(48)
    invitation = TeamInvitation(
        team_id=team.id,
        email=body.email,
        invited_by=user.id,
        role=body.role,
        token=token,
        message=body.message,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    await db.flush()

    invite_url = f"{settings.FRONTEND_URL}/invite/{token}"
    logger.info(
        "Team invitation created: team_id={} email={} by user_id={}",
        team.id, body.email, user.id,
    )
    return InvitationResponse(
        id=invitation.id,
        team_id=invitation.team_id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        invite_url=invite_url,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )


@router.post("/invite/accept", response_model=MessageResponse)
async def accept_invitation(
    body: InviteAccept,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Accept a team invitation."""
    result = await db.execute(
        select(TeamInvitation).where(
            TeamInvitation.token == body.token,
            TeamInvitation.status == "pending",
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already used",
        )

    if invitation.expires_at < datetime.now(timezone.utc):
        invitation.status = "expired"
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    if user.email != invitation.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email",
        )

    if user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of a team. Leave first.",
        )

    team_result = await db.execute(
        select(Team).where(Team.id == invitation.team_id)
    )
    team = team_result.scalar_one_or_none()
    if not team or not team.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team no longer exists",
        )

    count = await _get_member_count(team.id, db)
    if count >= team.max_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team is full",
        )

    user.team_id = team.id
    user.team_role = invitation.role
    invitation.status = "accepted"
    await db.flush()

    logger.info(
        "Invitation accepted: user_id={} team_id={}",
        user.id, team.id,
    )
    return MessageResponse(message=f"You have joined team '{team.name}'")


@router.post("/leave", response_model=MessageResponse)
async def leave_team(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Leave the current team."""
    if not user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not a member of any team",
        )

    if user.team_role == "owner":
        count = await _get_member_count(user.team_id, db)
        if count > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transfer ownership before leaving. Other members still exist.",
            )
        result = await db.execute(
            select(Team).where(Team.id == user.team_id)
        )
        team = result.scalar_one_or_none()
        if team:
            team.is_active = False

    user.team_id = None
    user.team_role = None
    await db.flush()

    logger.info("User left team: user_id={}", user.id)
    return MessageResponse(message="You have left the team")
