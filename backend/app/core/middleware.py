# backend/app/core/middleware.py

import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from loguru import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs request method, path, status, and duration."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process the request and log timing information."""
        start = time.perf_counter()
        response: Response = Response(status_code=500)
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled error on {} {}", request.method, request.url.path)
            raise
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "{} {} → {} ({:.1f}ms)",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware that adds security headers to all responses."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Add security headers to the response."""
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response
