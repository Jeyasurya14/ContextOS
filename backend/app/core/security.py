# backend/app/core/security.py

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext
from loguru import logger

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with cost factor 12."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "jti": str(uuid4()),
        "type": "access",
    }
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(subject: str) -> str:
    """Create a JWT refresh token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "jti": str(uuid4()),
        "type": "refresh",
    }
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.debug("Token decode failed: {}", str(e))
        return None


def generate_api_key() -> str:
    """Generate a new API key with ctx_ prefix."""
    raw = secrets.token_urlsafe(32)
    return f"ctx_{raw}"


def hash_api_key(api_key: str) -> str:
    """SHA256 hash an API key for storage."""
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def generate_state_token() -> str:
    """Generate a random state token for OAuth flows."""
    return secrets.token_urlsafe(32)


def create_oauth_state_token(user_id: str) -> str:
    """Create a JWT state token containing user_id for OAuth flows."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=10)  # State token expires in 10 minutes
    
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": now,
        "type": "oauth_state",
    }
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_oauth_state_token(state_token: str) -> str | None:
    """Decode OAuth state token and return user_id."""
    try:
        payload = jwt.decode(
            state_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "oauth_state":
            return None
        return payload.get("sub")
    except JWTError as e:
        logger.debug("OAuth state token decode failed: {}", str(e))
        return None
