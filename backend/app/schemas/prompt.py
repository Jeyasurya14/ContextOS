# backend/app/schemas/prompt.py

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Scope = Literal["personal", "team"]


class PromptCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    description: str | None = Field(default=None, max_length=500)
    scope: Scope = "personal"
    tags: list[str] = Field(default_factory=list)


class PromptUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, max_length=500)
    scope: Scope | None = None
    tags: list[str] | None = None


class PromptResponse(BaseModel):
    id: str
    user_id: str
    team_id: str | None = None
    title: str
    body: str
    description: str | None = None
    scope: Scope
    tags: list[str]
    usage_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PromptListResponse(BaseModel):
    prompts: list[PromptResponse]
    total: int
