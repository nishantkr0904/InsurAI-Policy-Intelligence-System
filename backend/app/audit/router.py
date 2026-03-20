"""
Audit Trail Router.

Exposes GET /api/v1/audit and /api/v1/audit/analytics endpoints.

Architecture ref:
  docs/requirements.md #FR021 – Audit Trail Logging
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.audit.schemas import (
    AuditAction,
    AuditAnalytics,
    AuditAnalyticsRequest,
    AuditLogsRequest,
    AuditLogsResponse,
    AuditStatus,
    SeverityLevel,
)
from app.audit.service import get_audit_analytics, get_audit_logs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/audit", tags=["Audit Trail"])


@router.get(
    "",
    response_model=AuditLogsResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve audit logs for a workspace",
    description=(
        "Get audit trail logs with optional filtering by user, action, status, severity, and date range. "
        "Supports pagination and sorting."
    ),
)
async def get_audit_logs_endpoint(
    workspace_id: str = "default",
    user_id_filter: str | None = None,
    action_filter: AuditAction | None = None,
    status_filter: AuditStatus | None = None,
    severity_filter: SeverityLevel | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "timestamp",
    session: AsyncSession = Depends(get_db),
) -> AuditLogsResponse:
    """
    Retrieve audit logs for a workspace.

    Query parameters:
      - workspace_id: Workspace namespace (default: "default")
      - user_id_filter: Filter by user ID
      - action_filter: Filter by action type (document_upload, chat_query, etc.)
      - status_filter: Filter by status (success, failure, partial, error)
      - severity_filter: Filter by severity (info, warning, error, critical)
      - start_date: Filter start date (ISO 8601)
      - end_date: Filter end date (ISO 8601)
      - limit: Maximum results (1-500, default: 50)
      - offset: Result offset for pagination (default: 0)
      - sort_by: Sort field (timestamp, action, status)

    Response:
      - logs: List of AuditLog objects with:
        - audit_id, timestamp, workspace_id, user_id, user_email
        - action, status, severity, resource_type, resource_id
        - description, metadata (IP, user agent, duration, context)
      - total: Total number of matching logs
      - limit, offset: Pagination info
      - has_more: Whether more results exist
      - summary: Statistics (counts by action, status, user, severity)

    Errors:
      - 400: Invalid query parameters
      - 503: Service unavailable
    """
    logger.info(
        "Audit logs request: workspace=%s user=%s action=%s status=%s severity=%s limit=%d offset=%d",
        workspace_id,
        user_id_filter,
        action_filter,
        status_filter,
        severity_filter,
        limit,
        offset,
    )

    # Validate parameters
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 500",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset must be >= 0",
        )
    if sort_by not in ["timestamp", "action", "status"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sort_by must be one of: timestamp, action, status",
        )

    try:
        request = AuditLogsRequest(
            workspace_id=workspace_id,
            user_id_filter=user_id_filter,
            action_filter=action_filter,
            status_filter=status_filter,
            severity_filter=severity_filter,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
        )
        result = await get_audit_logs(request, session)
    except Exception as exc:
        logger.error("Failed to retrieve audit logs: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Audit log service unavailable: {exc}",
        ) from exc

    logger.info(
        "Audit logs returned: total=%d returned=%d",
        result.total,
        len(result.logs),
    )

    return result


@router.get(
    "/analytics",
    response_model=AuditAnalytics,
    status_code=status.HTTP_200_OK,
    summary="Generate audit trail analytics",
    description=(
        "Generate analytics summary including top actions, most active users, "
        "success rates, and error counts."
    ),
)
async def get_analytics_endpoint(
    workspace_id: str = "default",
    start_date: str | None = None,
    end_date: str | None = None,
    top_n: int = 10,
    session: AsyncSession = Depends(get_db),
) -> AuditAnalytics:
    """
    Generate audit trail analytics.

    Query parameters:
      - workspace_id: Workspace namespace (default: "default")
      - start_date: Analysis start date (ISO 8601)
      - end_date: Analysis end date (ISO 8601)
      - top_n: Number of top items to return (1-50, default: 10)

    Response includes:
      - workspace_id: Workspace analyzed
      - total_events: Total number of audit events
      - success_rate: Overall success rate percentage
      - top_actions: Most frequent actions with counts and success rates
      - most_active_users: Users with most actions and last activity
      - error_count: Total error events
      - critical_count: Total critical severity events
      - avg_response_time_ms: Average operation response time
      - period_start, period_end: Analysis period

    Errors:
      - 400: Invalid query parameters
      - 503: Service unavailable
    """
    logger.info(
        "Audit analytics request: workspace=%s start=%s end=%s top_n=%d",
        workspace_id,
        start_date,
        end_date,
        top_n,
    )

    # Validate parameters
    if top_n < 1 or top_n > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="top_n must be between 1 and 50",
        )

    try:
        request = AuditAnalyticsRequest(
            workspace_id=workspace_id,
            start_date=start_date,
            end_date=end_date,
            top_n=top_n,
        )
        result = await get_audit_analytics(request, session)
    except Exception as exc:
        logger.error("Failed to generate audit analytics: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Audit analytics service unavailable: {exc}",
        ) from exc

    logger.info(
        "Audit analytics generated: total_events=%d success_rate=%.1f%% top_actions=%d",
        result.total_events,
        result.success_rate,
        len(result.top_actions),
    )

    return result
