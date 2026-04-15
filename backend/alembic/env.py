# backend/alembic/env.py
#
# NOTE: Alembic is a *synchronous* tool. We deliberately use psycopg2 (sync
# driver) with NullPool here instead of asyncpg.  Using asyncpg via
# asyncio.run() inside Render's build environment caused:
#   asyncpg.exceptions.ConnectionDoesNotExistError: connection was closed
#   in the middle of operation
# because the greenlet/asyncio integration conflicts with how the build
# runner manages the event loop.  NullPool + psycopg2 = one connection,
# synchronous, no pool housekeeping — exactly what migrations need.

import re
from logging.config import fileConfig
from sqlalchemy import pool, engine_from_config
from sqlalchemy.engine import Connection
from alembic import context
from app.core.config import settings
from app.core.database import Base

# Import ALL models so their tables are registered on Base.metadata
# This is critical — missing imports = missing tables in migration
from app.models.user import User
from app.models.integration import Integration
from app.models.project import Project
from app.models.context_chunk import ContextChunk
from app.models.conversation import Conversation, ConversationMessage
from app.models.team import Team, TeamInvitation
from app.models.billing import BillingEvent, UsageRecord


def _sync_db_url(url: str) -> str:
    """Convert any asyncpg URL to a psycopg2 URL for Alembic's sync engine.
    Also strip query-string SSL params — psycopg2 uses connect_args instead."""
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    url = url.replace("postgresql+asyncpg:", "postgresql+psycopg2:")
    # Strip ?ssl=...  and ?sslmode=... — psycopg2 uses connect_args
    url = re.sub(r"[?&]ssl=[^&]*", "", url)
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    url = re.sub(r"\?$", "", url)
    url = re.sub(r"\?&", "?", url)
    return url


def _needs_ssl(url: str) -> bool:
    """Return True for external managed PostgreSQL hosts that require SSL."""
    external = (
        ".render.com", ".onrender.com", "amazonaws.com",
        "supabase.co", "supabase.com", "neon.tech", "cockroachlabs.cloud",
    )
    return any(m in url for m in external)


config = context.config

# Build the sync URL from the application's DATABASE_URL
_raw_url = settings.DATABASE_URL
_migration_url = _sync_db_url(_raw_url)
config.set_main_option("sqlalchemy.url", _migration_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Use a synchronous psycopg2 engine with NullPool — safest for migrations."""
    connect_args: dict = {"sslmode": "require"} if _needs_ssl(_migration_url) else {}
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )
    with connectable.connect() as connection:
        do_run_migrations(connection)
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
