# backend/app/schemas/auth.py

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Schema for user registration request."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Schema for user login request."""

    email: EmailStr
    password: str


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str


class UserResponse(BaseModel):
    """Schema for user data in responses."""

    id: str
    email: str
    name: str  # Changed from full_name to name
    is_active: bool
    is_verified: bool
    is_admin: bool = False
    plan: str = "free"
    api_key_prefix: str | None = None
    team_id: str | None = None
    team_role: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse | None = None


class APIKeyResponse(BaseModel):
    """Schema for API key generation response."""

    api_key: str
    prefix: str
    name: str | None = None
    message: str = "Save this key now. It will not be shown again."


class APIKeyStatusResponse(BaseModel):
    """Schema for API key status query."""

    has_key: bool
    prefix: str | None = None
    name: str | None = None
    created_at: datetime | None = None


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
