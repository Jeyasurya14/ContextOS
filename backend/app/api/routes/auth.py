# backend/app/api/routes/auth.py

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from loguru import logger

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    generate_api_key,
    hash_api_key,
    decode_token,
)
from app.models.user import User
from app.models.team import Team
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    UserResponse,
    APIKeyResponse,
    APIKeyStatusResponse,
    MessageResponse,
)
from app.api.deps import get_current_user
from app.services.qdrant_service import delete_by_user

router = APIRouter(tags=["auth"])


class ProfileUpdateRequest(BaseModel):
    """Schema for updating the current user's profile."""

    full_name: str = Field(min_length=1, max_length=255)


class GenerateApiKeyRequest(BaseModel):
    """Optional name for the generated API key."""

    name: str | None = Field(default=None, max_length=255)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Register a new user account."""
    result = await db.execute(select(User).where(User.email == data.email))
    existing = result.scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()

    logger.info("New user registered: user_id={}", user.id)

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate user and return tokens."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    logger.info("User logged in: user_id={}", user.id)

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    # Include user data in response
    user_data = UserResponse.model_validate(user)

    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_data,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Refresh access token using a valid refresh token."""
    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Get current authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the current authenticated user's profile."""
    current_user.full_name = data.full_name
    await db.flush()

    logger.info("User profile updated: user_id={}", current_user.id)
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Client-side logout acknowledgement for compatibility."""
    logger.info("User logged out: user_id={}", current_user.id)
    return MessageResponse(message="Logged out successfully")


# ─────────────────────────────────────────────────────────────────────────────
# API Key management
# ─────────────────────────────────────────────────────────────────────────────

async def _generate_key_for_user(
    db: AsyncSession,
    current_user: User,
    name: str | None = None,
) -> APIKeyResponse:
    """Core logic to rotate a user's API key."""
    api_key = generate_api_key()
    prefix = api_key[:8]
    hashed = hash_api_key(api_key)
    key_name = name or "Default Key"

    current_user.api_key_hash = hashed
    current_user.api_key_prefix = prefix
    current_user.api_key_name = key_name
    current_user.api_key_created_at = datetime.now(timezone.utc)
    await db.flush()

    logger.info("API key generated for user_id={} name={}", current_user.id, key_name)

    return APIKeyResponse(
        api_key=api_key,
        prefix=prefix,
        name=key_name,
    )


@router.post("/api-key", response_model=APIKeyResponse)
async def generate_user_api_key(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    data: GenerateApiKeyRequest = GenerateApiKeyRequest(),
) -> APIKeyResponse:
    """Generate a new API key for the current user."""
    return await _generate_key_for_user(db, current_user, data.name)


@router.post("/api-keys", response_model=APIKeyResponse)
async def generate_user_api_key_compat(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    data: GenerateApiKeyRequest = GenerateApiKeyRequest(),
) -> APIKeyResponse:
    """Compatibility alias for frontend clients expecting plural API key routes."""
    return await _generate_key_for_user(db, current_user, data.name)


@router.get("/api-key/status", response_model=APIKeyStatusResponse)
async def get_api_key_status(
    current_user: User = Depends(get_current_user),
) -> APIKeyStatusResponse:
    """Return metadata about the current user's active API key (never the raw key)."""
    return APIKeyStatusResponse(
        has_key=bool(current_user.api_key_prefix),
        prefix=current_user.api_key_prefix,
        name=getattr(current_user, "api_key_name", None),
        created_at=getattr(current_user, "api_key_created_at", None),
    )


@router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the current user's API key metadata (no raw keys exposed)."""
    keys = []
    if current_user.api_key_prefix:
        keys.append(
            {
                "id": "default",
                "name": getattr(current_user, "api_key_name", None) or "Default Key",
                "prefix": current_user.api_key_prefix,
                "created_at": (
                    getattr(current_user, "api_key_created_at", None).isoformat()
                    if getattr(current_user, "api_key_created_at", None)
                    else None
                ),
            }
        )
    return {"api_keys": keys}


@router.delete("/api-key", response_model=MessageResponse)
async def revoke_api_key(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Revoke the current user's API key."""
    current_user.api_key_hash = None
    current_user.api_key_prefix = None
    current_user.api_key_name = None
    current_user.api_key_created_at = None
    await db.flush()

    logger.info("API key revoked for user_id={}", current_user.id)

    return MessageResponse(message="API key revoked successfully")


@router.delete("/api-keys/{key_id}", response_model=MessageResponse)
async def revoke_api_key_compat(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Compatibility alias for frontend clients expecting plural API key routes."""
    return await revoke_api_key(db=db, current_user=current_user)


# ─────────────────────────────────────────────────────────────────────────────
# Account deletion
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/me", response_model=MessageResponse)
async def delete_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Delete the current authenticated user and associated application data."""
    if current_user.team_id and current_user.team_role == "owner":
        member_count_result = await db.execute(
            select(func.count(User.id)).where(User.team_id == current_user.team_id)
        )
        member_count = member_count_result.scalar_one()
        if member_count > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transfer ownership or remove other members before deleting your account",
            )

        team_result = await db.execute(select(Team).where(Team.id == current_user.team_id))
        team = team_result.scalar_one_or_none()
        if team:
            team.is_active = False

    await delete_by_user(str(current_user.id))

    await db.delete(current_user)
    await db.flush()

    logger.info("User account deleted: user_id={}", current_user.id)
    return MessageResponse(message="Account deleted successfully")
