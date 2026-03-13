#!/bin/bash
set -e

# Use container Python explicitly
export PYTHON=/usr/local/bin/python3.11
export PATH="/usr/local/bin:$PATH"

if [ "$1" = "web" ]; then
    echo "Running database migrations..."
    python3.11 -m alembic upgrade head
    echo "Starting web server..."
    exec python3.11 -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
elif [ "$1" = "worker" ]; then
    echo "Starting Celery worker..."
    exec python3.11 -m celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
elif [ "$1" = "beat" ]; then
    echo "Starting Celery beat..."
    exec python3.11 -m celery -A app.workers.celery_app beat --loglevel=info
else
    exec "$@"
fi
