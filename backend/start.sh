#!/usr/bin/env bash
# Render start script — runs migrations then starts the server.
set -e

echo "==> Running database migrations..."
# Run migrations but don't crash the server if they fail —
# the app has its own retry logic in lifespan and will log the error.
python -m alembic upgrade head && echo "==> Migrations complete ✓" \
    || echo "WARNING: Migrations failed (check DATABASE_URL env var). Continuing startup..."

echo "==> Starting gunicorn server..."
exec gunicorn app.main:app \
    -k uvicorn.workers.UvicornWorker \
    -w 2 \
    -b "0.0.0.0:${PORT:-8000}" \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --log-level info
