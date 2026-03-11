# backend/app/main.py

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
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
    logger.info("Starting {} v{}", settings.APP_NAME, settings.APP_VERSION)
    await init_db()
    logger.info("Application startup complete")
    yield
    await close_db()
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(projects_router, prefix=settings.API_V1_PREFIX)
app.include_router(github_router, prefix=settings.API_V1_PREFIX)
app.include_router(notion_router, prefix=settings.API_V1_PREFIX)
app.include_router(slack_router, prefix=settings.API_V1_PREFIX)
app.include_router(context_router, prefix=settings.API_V1_PREFIX)
app.include_router(query_router, prefix=settings.API_V1_PREFIX)
app.include_router(integrations_router, prefix=settings.API_V1_PREFIX)
app.include_router(teams_router, prefix=settings.API_V1_PREFIX)
app.include_router(billing_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
