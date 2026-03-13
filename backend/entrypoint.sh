#!/bin/bash
set -e

if [ "$1" = "web" ]; then
    echo "Running database migrations..."
    alembic upgrade head
    echo "Starting web server..."
    exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
elif [ "$1" = "worker" ]; then
    echo "Starting Celery worker..."
    exec celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
elif [ "$1" = "beat" ]; then
    echo "Starting Celery beat..."
    exec celery -A app.workers.celery_app beat --loglevel=info
else
    exec "$@"
fi
