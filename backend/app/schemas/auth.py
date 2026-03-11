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


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str


class UserResponse(BaseModel):
    """Schema for user data in responses."""

    id: str
    email: str
    full_name: str
    is_active: bool
    is_verified: bool
    plan: str
    api_key_prefix: str | None = None
    team_id: str | None = None
    team_role: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class APIKeyResponse(BaseModel):
    """Schema for API key generation response."""

    api_key: str
    prefix: str
    message: str = "Save this key now. It will not be shown again."


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
