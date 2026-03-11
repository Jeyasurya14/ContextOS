# backend/app/schemas/team.py

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class TeamCreate(BaseModel):
    """Schema for creating a new team."""

    name: str = Field(min_length=1, max_length=255)


class TeamUpdate(BaseModel):
    """Schema for updating a team."""

    name: str | None = Field(default=None, min_length=1, max_length=255)


class TeamResponse(BaseModel):
    """Schema for team data in responses."""

    id: str
    name: str
    slug: str
    owner_id: str
    plan: str
    max_members: int
    max_chunks: int
    total_chunks: int
    is_active: bool
    member_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    """Schema for a team member."""

    id: str
    email: str
    full_name: str
    team_role: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteCreate(BaseModel):
    """Schema for creating a team invitation."""

    email: EmailStr
    role: str = Field(default="member", pattern="^(member|admin)$")
    message: str | None = None


class InvitationResponse(BaseModel):
    """Schema for invitation data in responses."""

    id: str
    team_id: str
    email: str
    role: str
    status: str
    invite_url: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteAccept(BaseModel):
    """Schema for accepting a team invitation."""

    token: str
