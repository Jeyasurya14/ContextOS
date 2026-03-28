# backend/app/core/rate_limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Depends
from fastapi.responses import JSONResponse
from loguru import logger
from typing import Optional
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import decode_token


# Enhanced rate limiter that can use user ID when authenticated
def _get_user_id_or_ip(request: Request) -> str:
    """Get user ID if authenticated, otherwise fall back to IP address."""
    # Try to get user from JWT token
    authorization = request.headers.get("Authorization", "")
    x_api_key = request.headers.get("X-API-Key", "")

    if x_api_key and x_api_key.startswith("ctx_"):
        return f"user:{x_api_key[:16]}"  # Use prefix of API key as identifier

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        try:
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id = payload.get("sub")
                if user_id:
                    return f"user:{user_id}"
        except Exception:
            pass

    # Fallback to IP
    ip = get_remote_address(request)
    return f"ip:{ip}"


limiter = Limiter(key_func=_get_user_id_or_ip)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded errors."""
    identifier = _get_user_id_or_ip(request)
    logger.warning(
        "Rate limit exceeded: identifier={} path={} limit={}",
        identifier,
        request.url.path,
        exc.detail,
    )
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please slow down or upgrade your plan.",
            "retry_after": str(exc.detail),
        },
        headers={
            "X-RateLimit-Limit": str(exc.detail),
            "Retry-After": str(exc.detail),
        },
    )
