# backend/app/main.py

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.core.config import settings
from app.core.database import init_db, close_db, check_database_health, engine
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.services.qdrant_service import init_collection, check_qdrant_health
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.github import router as github_router
from app.api.routes.notion import router as notion_router
from app.api.routes.slack import router as slack_router
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
    
    await init_db()
    await init_collection()
    
    db_ok = await check_database_health()
    qdrant_ok = await check_qdrant_health()
    
    if not db_ok:
        logger.error("Database connection FAILED on startup")
    if not qdrant_ok:
        logger.error("Qdrant connection FAILED on startup")
    
    logger.info("ContextOS API started successfully")
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
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "https://contextos.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "contextos-api.onrender.com",
            "*.onrender.com",
            "localhost",
            "127.0.0.1",
        ],
    )

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(health_router, tags=["health"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(context_router, prefix="/api/v1/context", tags=["context"])
app.include_router(query_router, prefix="/api/v1/query", tags=["query"])
app.include_router(github_router, prefix="/api/v1/integrations/github", tags=["github"])
app.include_router(notion_router, prefix="/api/v1/integrations/notion", tags=["notion"])
app.include_router(slack_router, prefix="/api/v1/integrations/slack", tags=["slack"])
app.include_router(integrations_router, prefix="/api/v1/integrations", tags=["integrations"])
app.include_router(teams_router, prefix="/api/v1/teams", tags=["teams"])
app.include_router(billing_router, prefix="/api/v1/billing", tags=["billing"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
