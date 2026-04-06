"""
Celery application factory.

Configures the Celery instance using Redis as both the broker and result backend.
All InsurAI background tasks are registered under the "insurai" namespace.

Architecture ref:
  docs/system-architecture.md §11 – Data Storage Strategy (Redis)
  docs/roadmap.md Phase 3 – "Configure Celery workers using Redis as the task broker"
"""

from celery import Celery

from app.core.config import settings


def create_celery_app() -> Celery:
    """
    Instantiate and configure the Celery application.

    Returns:
        A Celery instance ready for task registration and execution.
    """
    celery_app = Celery(
        "insurai",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
        include=["app.workers.ingestion_tasks", "app.workers.notification_tasks"],
    )

    celery_app.conf.update(
        # Serialization
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        # Timezone
        timezone="UTC",
        enable_utc=True,
        # Retry behaviour
        task_acks_late=True,           # Re-queue if worker dies mid-task
        task_reject_on_worker_lost=True,
        # Result TTL – keep results for 1 hour
        result_expires=3600,
        # Concurrency – sensible default; override via CELERYD_CONCURRENCY env
        worker_prefetch_multiplier=1,  # Fair dispatch: one task at a time per worker
    )

    return celery_app


celery_app = create_celery_app()
