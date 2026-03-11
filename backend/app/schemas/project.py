# backend/app/schemas/project.py

from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None


class ProjectResponse(BaseModel):
    """Schema for project data in responses."""

    id: str
    name: str
    description: str | None = None
    user_id: str
    team_id: str | None = None
    is_active: bool
    total_chunks: int
    last_synced_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    """Schema for paginated project list."""

    projects: list[ProjectResponse]
    total: int
