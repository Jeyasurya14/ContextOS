#!/usr/bin/env bash
# Render start script — runs migrations THEN starts the server.
# Migrations run here (not in build) so DATABASE_URL is always available.
set -e

echo "==> Running database migrations..."
python -m alembic upgrade head
echo "==> Migrations complete ✓"

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
