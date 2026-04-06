"""
Notifications Router.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.notifications.schemas import (
    MarkAllReadResponse,
    MarkReadResponse,
    NotificationPriority,
    NotificationStatus,
    NotificationsListResponse,
    NotificationType,
)
from app.notifications.service import (
    mark_all_notifications_as_read,
    mark_notification_as_read,
    resolve_authenticated_user,
    get_user_notifications,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get notifications for current user",
)
async def list_notifications_endpoint(
    request: Request,
    workspace_id: str = "default",
    status_filter: NotificationStatus | None = None,
    type_filter: NotificationType | None = None,
    priority_filter: NotificationPriority | None = None,
    limit: int = 20,
    offset: int = 0,
    x_user_id: str | None = Header(None, alias="X-User-ID"),
    session: AsyncSession = Depends(get_db),
) -> NotificationsListResponse:
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 100",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset must be >= 0",
        )

    user = await resolve_authenticated_user(request=request, session=session, x_user_id=x_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    if user.role != "admin" and user.workspace and workspace_id != user.workspace:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access notifications for a different workspace",
        )

    return await get_user_notifications(
        session=session,
        user_id=user.email,
        role=user.role or "user",
        workspace_id=workspace_id,
        status_filter=status_filter,
        type_filter=type_filter,
        priority_filter=priority_filter,
        limit=limit,
        offset=offset,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=MarkReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark a notification as read",
)
async def mark_notification_read_endpoint(
    notification_id: str,
    request: Request,
    workspace_id: str = "default",
    x_user_id: str | None = Header(None, alias="X-User-ID"),
    session: AsyncSession = Depends(get_db),
) -> MarkReadResponse:
    user = await resolve_authenticated_user(request=request, session=session, x_user_id=x_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    item = await mark_notification_as_read(
        session=session,
        notification_id=notification_id,
        user_id=user.email,
        role=user.role or "user",
        workspace_id=workspace_id,
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return MarkReadResponse(id=item.id, status=item.status, read_at=item.read_at)


@router.post(
    "/read-all",
    response_model=MarkAllReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read",
)
async def mark_all_notifications_read_endpoint(
    request: Request,
    workspace_id: str = "default",
    type_filter: NotificationType | None = None,
    priority_filter: NotificationPriority | None = None,
    x_user_id: str | None = Header(None, alias="X-User-ID"),
    session: AsyncSession = Depends(get_db),
) -> MarkAllReadResponse:
    user = await resolve_authenticated_user(request=request, session=session, x_user_id=x_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    updated = await mark_all_notifications_as_read(
        session=session,
        user_id=user.email,
        role=user.role or "user",
        workspace_id=workspace_id,
        type_filter=type_filter,
        priority_filter=priority_filter,
    )
    return MarkAllReadResponse(updated=updated)
