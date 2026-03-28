#!/usr/bin/env python3
"""
Database maintenance script for production optimizations.

Run this after deploying new indexes:
- Updates statistics for query planner
- Reindexes if needed
- Vacuums tables
- Checks for missing indexes

Usage:
    python scripts/maintain_db.py --analyze
    python scripts/maintain_db.py --vacuum
    python scripts/maintain_db.py --all
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from loguru import logger


async def analyze_statistics():
    """Update table statistics for query optimizer."""
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

    async with engine.connect() as conn:
        logger.info("Running ANALYZE to update table statistics...")

        # Get all tables
        result = await conn.execute(text("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        """))
        tables = [row[0] for row in result.fetchall()]

        for table in tables:
            try:
                await conn.execute(text(f"ANALYZE {table}"))
                logger.info(f"  ✓ Analyzed table: {table}")
            except Exception as e:
                logger.error(f"  ✗ Failed to analyze {table}: {e}")

        await conn.commit()
        logger.info("ANALYZE completed")

    await engine.dispose()


async def vacuum_tables():
    """Run VACUUM to reclaim space and update statistics."""
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        isolation_level="AUTOCOMMIT",  # VACUUM cannot run in transaction
    )

    async with engine.connect() as conn:
        logger.info("Running VACUUM ANALYZE...")

        # Get all tables
        result = await conn.execute(text("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        """))
        tables = [row[0] for row in result.fetchall()]

        for table in tables:
            try:
                await conn.execute(text(f"VACUUM ANALYZE {table}"))
                logger.info(f"  ✓ Vacuumed table: {table}")
            except Exception as e:
                logger.error(f"  ✗ Failed to vacuum {table}: {e}")

        logger.info("VACUUM ANALYZE completed")

    await engine.dispose()


async def check_indexes():
    """Check for missing indexes on foreign keys."""
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

    async with engine.connect() as conn:
        logger.info("Checking for missing indexes on foreign keys...")

        # Query to find foreign keys without indexes
        result = await conn.execute(text("""
            SELECT
                tc.table_name,
                kcu.column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
            WHERE
                tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
            EXCEPT
            SELECT
                tablename,
                indexname
            FROM
                pg_stat_user_indexes
            WHERE
                schemaname = 'public'
        """))

        missing = result.fetchall()

        if missing:
            logger.warning(f"Found {len(missing)} foreign keys without indexes:")
            for table, column in missing:
                logger.warning(f"  - {table}.{column}")
        else:
            logger.info("✓ All foreign keys have indexes")

    await engine.dispose()


async def check_bloat():
    """Check for table bloat."""
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

    async with engine.connect() as conn:
        logger.info("Checking table bloat...")

        result = await conn.execute(text("""
            SELECT
                schemaname AS table_schema,
                relname AS table_name,
                n_dead_tup AS dead_rows,
                n_live_tup AS live_rows,
                round(100.0 * n_dead_tup / (n_live_tup + 1), 2) AS bloat_percent
            FROM
                pg_stat_user_tables
            WHERE
                n_dead_tup > 1000
                AND round(100.0 * n_dead_tup / (n_live_tup + 1), 2) > 20
            ORDER BY
                bloat_percent DESC
            LIMIT 10;
        """))

        bloated = result.fetchall()

        if bloated:
            logger.warning("Top bloated tables:")
            for schema, table, dead, live, percent in bloated:
                logger.warning(f"  - {schema}.{table}: {percent}% bloat ({dead}/{live})")
        else:
            logger.info("✓ No significant table bloat detected")

    await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description="Database maintenance utilities")
    parser.add_argument("--analyze", action="store_true", help="Update table statistics")
    parser.add_argument("--vacuum", action="store_true", help="Run VACUUM ANALYZE")
    parser.add_argument("--check-indexes", action="store_true", help="Check for missing indexes")
    parser.add_argument("--check-bloat", action="store_true", help="Check table bloat")
    parser.add_argument("--all", action="store_true", help="Run all maintenance tasks")

    args = parser.parse_args()

    if not any([args.analyze, args.vacuum, args.check_indexes, args.check_bloat, args.all]):
        parser.print_help()
        sys.exit(1)

    logger.info("Starting database maintenance...")

    if args.all or args.analyze:
        await analyze_statistics()

    if args.all or args.vacuum:
        await vacuum_tables()

    if args.all or args.check_indexes:
        await check_indexes()

    if args.all or args.check_bloat:
        await check_bloat()

    logger.info("Database maintenance completed")


if __name__ == "__main__":
    asyncio.run(main())
