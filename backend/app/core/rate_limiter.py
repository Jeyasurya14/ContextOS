# backend/app/core/rate_limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from loguru import logger


limiter = Limiter(key_func=get_remote_address)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded errors."""
    logger.warning(
        "Rate limit exceeded: ip={} path={}",
        request.client.host if request.client else "unknown",
        request.url.path,
    )
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down.",
            "retry_after": str(exc.detail),
        },
    )
