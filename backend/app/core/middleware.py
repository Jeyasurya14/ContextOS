# backend/app/core/middleware.py

import time
import gzip
import io
from fastapi import Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import Message
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
                "{} {} → {} ({:.1f}ms) size={}b",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                response.headers.get("content-length", 0),
            )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware that adds security headers to all responses."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Add security headers to the response."""
        from app.core.config import settings
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class GZipMiddleware(BaseHTTPMiddleware):
    """Middleware that compresses responses using gzip for eligible content."""

    MINIMUM_SIZE = 500  # Only compress responses larger than this
    EXCLUDE_PATHS = {
        "/api/v1/query",  # Already streaming, handled separately
    }

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Compress response if client supports gzip and response is compressible."""
        response = await call_next(request)

        # Skip compression for excluded paths or non-success responses
        if request.url.path in self.EXCLUDE_PATHS or response.status_code < 200 or response.status_code >= 300:
            return response

        # Check if client accepts gzip
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding:
            return response

        # Check content type (compress text-based content)
        content_type = response.headers.get("content-type", "")
        if not content_type.startswith(("text/", "application/json", "application/xml")):
            return response

        # Get response body
        body = b""
        if isinstance(response, StreamingResponse):
            # For streaming responses, we need to buffer (use with caution)
            # Generally better to not compress large streams
            return response

        async for chunk in response.body_iterator:
            body += chunk

        # Only compress if above minimum size
        if len(body) < self.MINIMUM_SIZE:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        # Compress
        gzipped_body = gzip.compress(body)
        response = Response(
            content=gzipped_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )
        response.headers["content-encoding"] = "gzip"
        response.headers["content-length"] = str(len(gzipped_body))
        return response


class TimeoutMiddleware(BaseHTTPMiddleware):
    """Middleware that sets timeout for long-running requests."""

    # Timeouts in seconds for different endpoints
    TIMEOUTS = {
        "/api/v1/query": 60,  # 60 seconds for AI queries
        "/health": 5,  # 5 seconds for health checks
    }

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Apply timeout to long-running requests."""
        import asyncio

        timeout = self.TIMEOUTS.get(request.url.path, 30)  # Default 30 seconds

        try:
            async with asyncio.timeout(timeout):
                response = await call_next(request)
            return response
        except asyncio.TimeoutError:
            logger.error("Request timeout: {} {}", request.method, request.url.path)
            return JSONResponse(
                status_code=504,
                content={
                    "detail": f"Request timeout after {timeout} seconds. The operation took too long."
                }
            )
