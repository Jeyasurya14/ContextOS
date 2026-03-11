# backend/app/workers/celery_app.py

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "contextos",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=3600,
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery_app.conf.beat_schedule = {
    "sync_notion_every_30_min": {
        "task": "app.workers.notion_worker.sync_notion_changes",
        "schedule": 1800.0,
    },
    "sync_slack_every_hour": {
        "task": "app.workers.slack_worker.sync_slack_changes",
        "schedule": 3600.0,
    },
}

celery_app.autodiscover_tasks([
    "app.workers.github_worker",
    "app.workers.notion_worker",
    "app.workers.slack_worker",
])
