"""
Notifications service layer.
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import Request
from sqlalchemy import case, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import get_user_by_email
from app.auth.session import get_email_from_session_token
from app.core.config import settings
from app.models import AuditLog, Notification
from app.notifications.schemas import (
    NotificationItem,
    NotificationPriority,
    NotificationStatus,
    NotificationsListResponse,
    NotificationType,
)

logger = logging.getLogger(__name__)


_ROLE_ALLOWED_TYPES: dict[str, set[str]] = {
    "underwriter": {
        NotificationType.POLICY.value,
        NotificationType.RISK.value,
        NotificationType.SYSTEM.value,
    },
    "claims_adjuster": {
        NotificationType.CLAIM.value,
        NotificationType.POLICY.value,
        NotificationType.SYSTEM.value,
    },
    "compliance_officer": {
        NotificationType.COMPLIANCE.value,
        NotificationType.AUDIT.value,
        NotificationType.FRAUD.value,
        NotificationType.SYSTEM.value,
    },
    "fraud_analyst": {
        NotificationType.FRAUD.value,
        NotificationType.AUDIT.value,
        NotificationType.SYSTEM.value,
    },
}


def _normalize_role(role: str | None) -> str:
    if not role:
        return ""
    return role.strip().lower().replace("-", "_").replace(" ", "_")


def _allowed_types_for_role(role: str) -> set[str]:
    normalized_role = _normalize_role(role)
    if normalized_role == "admin":
        return {t.value for t in NotificationType}
    # Strict RBAC allowlist for role-scoped filtering.
    return _ROLE_ALLOWED_TYPES.get(normalized_role, {NotificationType.SYSTEM.value})


def _priority_to_severity(priority: NotificationPriority) -> str:
    if priority == NotificationPriority.CRITICAL:
        return "critical"
    if priority == NotificationPriority.HIGH:
        return "warning"
    if priority == NotificationPriority.MEDIUM:
        return "info"
    return "info"


def _metadata_for_api(value: dict | None) -> dict:
    if isinstance(value, dict):
        return value
    return {}


def _to_item(record: Notification) -> NotificationItem:
    return NotificationItem(
        id=record.id,
        user_id=record.user_id,
        role=record.role,
        workspace_id=record.workspace_id,
        type=record.type,
        priority=record.priority,
        status=record.status,
        title=record.title,
        message=record.message,
        metadata=_metadata_for_api(record.meta_data),
        created_at=record.created_at,
        read_at=record.read_at,
    )


async def resolve_authenticated_user(
    request: Request,
    session: AsyncSession,
    x_user_id: str | None = None,
):
    """Resolve authenticated user from secure session cookie or X-User-ID fallback."""
    session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
    session_email = get_email_from_session_token(session_cookie)
    candidate_identity = session_email or x_user_id
    if not candidate_identity:
        return None
    return await get_user_by_email(session, candidate_identity)


async def create_notification(
    session: AsyncSession,
    *,
    user_id: str,
    role: str,
    workspace_id: str,
    notification_type: NotificationType,
    priority: NotificationPriority,
    title: str,
    message: str,
    metadata: dict | None = None,
    dedupe_key: str | None = None,
) -> Notification | None:
    """Create a notification and emit an audit log entry (idempotent via dedupe_key)."""
    if dedupe_key:
        existing = await session.execute(
            select(Notification).where(Notification.dedupe_key == dedupe_key)
        )
        found = existing.scalar_one_or_none()
        if found:
            return found

    record = Notification(
        user_id=user_id,
        role=role,
        workspace_id=workspace_id,
        type=notification_type.value,
        priority=priority.value,
        status=NotificationStatus.UNREAD.value,
        title=title,
        message=message,
        meta_data=metadata or {},
        dedupe_key=dedupe_key,
    )
    session.add(record)

    try:
        await session.flush()
    except IntegrityError:
        # Dedupe race condition: ignore duplicate insert.
        await session.rollback()
        return None

    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        user_email=user_id,
        action="notification_created",
        status="success",
        severity=_priority_to_severity(priority),
        resource_type="notification",
        resource_id=record.id,
        description=title,
        meta_data={
            "notification_type": notification_type.value,
            "priority": priority.value,
            "dedupe_key": dedupe_key,
            "metadata": metadata or {},
        },
    )
    session.add(audit)

    return record


async def create_notification_for_actor(
    request: Request,
    session: AsyncSession,
    *,
    workspace_id: str,
    notification_type: NotificationType,
    priority: NotificationPriority,
    title: str,
    message: str,
    metadata: dict | None = None,
    dedupe_key: str | None = None,
    x_user_id: str | None = None,
) -> Notification | None:
    user = await resolve_authenticated_user(request=request, session=session, x_user_id=x_user_id)
    if not user:
        return None

    return await create_notification(
        session,
        user_id=user.email,
        role=(user.role or "user"),
        workspace_id=workspace_id,
        notification_type=notification_type,
        priority=priority,
        title=title,
        message=message,
        metadata=metadata,
        dedupe_key=dedupe_key,
    )


async def dispatch_notification_for_actor(
    request: Request,
    session: AsyncSession,
    *,
    workspace_id: str,
    notification_type: NotificationType,
    priority: NotificationPriority,
    title: str,
    message: str,
    metadata: dict | None = None,
    dedupe_key: str | None = None,
    x_user_id: str | None = None,
) -> bool:
    """
    Dispatch notifications asynchronously through Celery when available.
    Falls back to inline DB creation to avoid losing events in local/dev setups.
    """
    user = await resolve_authenticated_user(request=request, session=session, x_user_id=x_user_id)
    if not user:
        return False

    payload = {
        "user_id": user.email,
        "role": user.role or "user",
        "workspace_id": workspace_id,
        "type": notification_type.value,
        "priority": priority.value,
        "title": title,
        "message": message,
        "metadata": metadata or {},
        "dedupe_key": dedupe_key,
    }

    try:
        from app.workers.celery_app import celery_app

        celery_app.send_task("insurai.notifications.create", args=[payload])
        return True
    except Exception as exc:
        logger.info("Falling back to inline notification creation: %s", exc)

    created = await create_notification(
        session=session,
        user_id=payload["user_id"],
        role=payload["role"],
        workspace_id=payload["workspace_id"],
        notification_type=notification_type,
        priority=priority,
        title=title,
        message=message,
        metadata=payload["metadata"],
        dedupe_key=payload["dedupe_key"],
    )
    return created is not None


async def get_user_notifications(
    session: AsyncSession,
    *,
    user_id: str,
    role: str,
    workspace_id: str,
    status_filter: NotificationStatus | None,
    type_filter: NotificationType | None,
    priority_filter: NotificationPriority | None,
    limit: int,
    offset: int,
) -> NotificationsListResponse:
    """Get role-safe, user-scoped notifications with prioritization."""
    normalized_role = _normalize_role(role)
    allowed_types = _allowed_types_for_role(role)

    base_filters = [
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id,
        Notification.type.in_(allowed_types),
    ]

    if normalized_role != "admin":
        base_filters.append(func.lower(Notification.role) == normalized_role)

    if status_filter:
        base_filters.append(Notification.status == status_filter.value)
    if type_filter:
        base_filters.append(Notification.type == type_filter.value)
    if priority_filter:
        base_filters.append(Notification.priority == priority_filter.value)

    priority_order = case(
        (Notification.priority == NotificationPriority.CRITICAL.value, 0),
        (Notification.priority == NotificationPriority.HIGH.value, 1),
        (Notification.priority == NotificationPriority.MEDIUM.value, 2),
        else_=3,
    )
    status_order = case(
        (Notification.status == NotificationStatus.UNREAD.value, 0),
        else_=1,
    )

    total_q = select(func.count(Notification.id)).where(*base_filters)
    total = (await session.execute(total_q)).scalar_one()

    unread_q = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id,
        Notification.status == NotificationStatus.UNREAD.value,
        Notification.type.in_(allowed_types),
    )
    if normalized_role != "admin":
        unread_q = unread_q.where(func.lower(Notification.role) == normalized_role)
    unread_count = (await session.execute(unread_q)).scalar_one()

    query = (
        select(Notification)
        .where(*base_filters)
        .order_by(priority_order, status_order, Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = (await session.execute(query)).scalars().all()

    items = [_to_item(row) for row in rows]
    return NotificationsListResponse(
        notifications=items,
        total=total,
        unread_count=unread_count,
        limit=limit,
        offset=offset,
        has_more=(offset + len(items)) < total,
    )


async def mark_notification_as_read(
    session: AsyncSession,
    *,
    notification_id: str,
    user_id: str,
    role: str,
    workspace_id: str,
) -> Notification | None:
    """Mark a single notification as read if it belongs to the authenticated user scope."""
    normalized_role = _normalize_role(role)

    filters = [
        Notification.id == notification_id,
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id,
    ]
    if normalized_role != "admin":
        filters.append(func.lower(Notification.role) == normalized_role)

    item_q = select(Notification).where(*filters)
    item = (await session.execute(item_q)).scalar_one_or_none()
    if not item:
        return None

    if item.status == NotificationStatus.READ.value:
        return item

    item.status = NotificationStatus.READ.value
    item.read_at = datetime.utcnow()
    await session.flush()
    return item


async def mark_all_notifications_as_read(
    session: AsyncSession,
    *,
    user_id: str,
    role: str,
    workspace_id: str,
    type_filter: NotificationType | None,
    priority_filter: NotificationPriority | None,
) -> int:
    """Bulk mark notifications as read in user scope."""
    normalized_role = _normalize_role(role)
    allowed_types = _allowed_types_for_role(role)

    filters = [
        Notification.user_id == user_id,
        Notification.workspace_id == workspace_id,
        Notification.status == NotificationStatus.UNREAD.value,
        Notification.type.in_(allowed_types),
    ]
    if normalized_role != "admin":
        filters.append(func.lower(Notification.role) == normalized_role)
    if type_filter:
        filters.append(Notification.type == type_filter.value)
    if priority_filter:
        filters.append(Notification.priority == priority_filter.value)

    stmt = (
        update(Notification)
        .where(*filters)
        .values(
            status=NotificationStatus.READ.value,
            read_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    result = await session.execute(stmt)
    return result.rowcount or 0
