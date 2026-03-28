# backend/app/main.py

import os
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.core.config import settings
from app.core.database import init_db, close_db, check_database_health, engine
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware, TimeoutMiddleware
from app.services.qdrant_service import init_collection, check_qdrant_health
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.github import router as github_router
from app.api.routes.notion import router as notion_router
from app.api.routes.slack import router as slack_router
from app.api.routes.linear import router as linear_router
from app.api.routes.google_drive import router as google_drive_router
from app.api.routes.context import router as context_router
from app.api.routes.query import router as query_router
from app.api.routes.integrations import router as integrations_router
from app.api.routes.teams import router as teams_router
from app.api.routes.billing import router as billing_router
from app.api.routes.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup and shutdown."""
    logger.info(f"Starting ContextOS API v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    # Log production optimizations
    logger.info(
        "Database pool: size={}, max_overflow={}, timeout={}s",
        settings.DATABASE_POOL_SIZE,
        settings.DATABASE_MAX_OVERFLOW,
        settings.DATABASE_POOL_TIMEOUT,
    )

    await init_db()
    qdrant_initialized = await init_collection()

    db_ok = await check_database_health()
    qdrant_ok = await check_qdrant_health()

    if not db_ok:
        logger.error("Database connection FAILED on startup")
    else:
        logger.info("Database connection verified")

    if not qdrant_ok:
        logger.warning(
            "Qdrant connection FAILED on startup; API is running in degraded mode"
        )
    elif qdrant_initialized:
        logger.info("Qdrant connection verified")

    logger.info(f"ContextOS API started successfully on port {os.getenv('PORT', 8000)}")
    yield
    await engine.dispose()
    logger.info("ContextOS API shut down cleanly")


app = FastAPI(
    title="ContextOS API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    # Production optimizations
    http_options={
        "timeout": 60.0,  # Global timeout for HTTP requests
    },
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Middleware order matters!
# 1. Security headers first
app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS early
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://localhost:\d+" if settings.DEBUG else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,  # Cache preflight for 10 minutes
)

# 3. Trusted hosts in production
if settings.ENVIRONMENT == "production":
    allowed_hosts = [
        "contextos-api.onrender.com",
        "*.onrender.com",
        "contextos.learnmade.in",
        "api.contextos.learnmade.in",
        "localhost",
        "127.0.0.1",
    ]
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts,
    )

# 4. Request size and content validation
@app.middleware("http")
async def validate_request(request: Request, call_next):
    """Validate request size and content."""
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_SIZE:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=413,
            content={"detail": "Request too large. Maximum size is 10 MB."}
        )

    # Validate Content-Type for POST/PUT requests
    if request.method in ("POST", "PUT", "PATCH"):
        content_type = request.headers.get("content-type", "")
        if not content_type.startswith("application/json"):
            return JSONResponse(
                status_code=415,
                content={"detail": "Unsupported media type. Only application/json is accepted."}
            )

    response = await call_next(request)
    return response

# 5. GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 6. Timeout middleware
app.add_middleware(TimeoutMiddleware)

# 7. Request logging last
app.add_middleware(RequestLoggingMiddleware)

# Include routers
app.include_router(health_router, tags=["health"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(context_router, prefix="/api/v1/context", tags=["context"])
app.include_router(query_router, prefix="/api/v1/query", tags=["query"])
app.include_router(github_router, prefix="/api/v1/integrations/github", tags=["github"])
app.include_router(notion_router, prefix="/api/v1/integrations/notion", tags=["notion"])
app.include_router(slack_router, prefix="/api/v1/integrations/slack", tags=["slack"])
app.include_router(linear_router, prefix="/api/v1/integrations/linear", tags=["linear"])
app.include_router(google_drive_router, prefix="/api/v1/integrations/google", tags=["google_drive"])
app.include_router(integrations_router, prefix="/api/v1/integrations", tags=["integrations"])
app.include_router(teams_router, prefix="/api/v1/teams", tags=["teams"])
app.include_router(billing_router, prefix="/api/v1/billing", tags=["billing"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
