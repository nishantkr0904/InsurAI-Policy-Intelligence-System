"""
Celery tasks for asynchronous notification creation.
"""

from __future__ import annotations

import asyncio
import logging

from app.database import AsyncSessionLocal
from app.notifications.schemas import NotificationPriority, NotificationType
from app.notifications.service import create_notification
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _create_notification_async(payload: dict) -> None:
    async with AsyncSessionLocal() as session:
        await create_notification(
            session=session,
            user_id=payload["user_id"],
            role=payload["role"],
            workspace_id=payload["workspace_id"],
            notification_type=NotificationType(payload["type"]),
            priority=NotificationPriority(payload["priority"]),
            title=payload["title"],
            message=payload["message"],
            metadata=payload.get("metadata") or {},
            dedupe_key=payload.get("dedupe_key"),
        )
        await session.commit()


@celery_app.task(name="insurai.notifications.create")
def create_notification_task(payload: dict) -> None:
    try:
        asyncio.run(_create_notification_async(payload))
    except Exception as exc:
        logger.warning("Notification task failed: %s", exc)
