# backend/app/workers/celery_app.py

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "contextos",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.github_worker",
        "app.workers.notion_worker",
        "app.workers.slack_worker",
        "app.workers.linear_worker",
        "app.workers.google_worker",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    task_soft_time_limit=600,
    task_time_limit=900,
    task_max_retries=3,
    result_expires=3600,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
    beat_schedule={
        "sync-notion-every-30-min": {
            "task": "app.workers.notion_worker.sync_notion_changes",
            "schedule": 1800.0,
        },
        "sync-slack-every-hour": {
            "task": "app.workers.slack_worker.sync_slack_changes",
            "schedule": 3600.0,
        },
        "sync-linear-every-hour": {
            "task": "app.workers.linear_worker.sync_linear_changes",
            "schedule": 3600.0,
        },
        "sync-google-every-hour": {
            "task": "app.workers.google_worker.sync_google_changes",
            "schedule": 3600.0,
        },
    },
)
