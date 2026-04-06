"""
Audit Trail Router.

Exposes GET /api/v1/audit and /api/v1/audit/analytics endpoints.

Architecture ref:
  docs/requirements.md #FR021 – Audit Trail Logging
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import get_user_by_email
from app.auth.session import get_email_from_session_token
from app.core.config import settings
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

_AUDIT_EXPORT_ALLOWED_ROLES = {"compliance_officer", "fraud_analyst", "auditor", "admin"}


def _normalize_role(role: str | None) -> str:
    return (role or "").strip().lower().replace(" ", "_")


async def _require_audit_export_access(
    request: Request,
    workspace_id: str,
    session: AsyncSession,
    x_user_id: str | None,
) -> str:
    """Authorize export access for compliance/auditor/admin users."""
    session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
    session_email = get_email_from_session_token(session_cookie)

    candidate_identity = session_email or x_user_id
    if not candidate_identity:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to export audit logs",
        )

    user = await get_user_by_email(session, candidate_identity)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found",
        )

    normalized_role = _normalize_role(user.role)
    if normalized_role not in _AUDIT_EXPORT_ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only compliance officers, auditors, or admins can export audit logs",
        )

    if normalized_role != "admin" and user.workspace and workspace_id != user.workspace:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot export audit logs for a different workspace",
        )

    return user.email


def _render_audit_logs_csv(logs: list) -> str:
    """Serialize audit logs to CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "audit_id",
            "timestamp",
            "workspace_id",
            "user_id",
            "user_email",
            "action",
            "status",
            "severity",
            "resource_type",
            "resource_id",
            "description",
            "ip_address",
            "user_agent",
            "duration_ms",
            "document_id",
            "claim_id",
            "alert_id",
            "query_text",
            "error_message",
            "additional_context",
        ]
    )

    for log in logs:
        metadata = log.metadata
        writer.writerow(
            [
                log.audit_id,
                log.timestamp,
                log.workspace_id,
                log.user_id,
                log.user_email or "",
                log.action.value,
                log.status.value,
                log.severity.value,
                log.resource_type or "",
                log.resource_id or "",
                log.description,
                metadata.ip_address or "",
                metadata.user_agent or "",
                metadata.duration_ms if metadata.duration_ms is not None else "",
                metadata.document_id or "",
                metadata.claim_id or "",
                metadata.alert_id or "",
                metadata.query_text or "",
                metadata.error_message or "",
                json.dumps(metadata.additional_context or {}, separators=(",", ":")),
            ]
        )

    return output.getvalue()


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


@router.get(
    "/export",
    status_code=status.HTTP_200_OK,
    summary="Export audit logs as CSV",
    description="Export workspace audit logs as a downloadable CSV file.",
)
async def export_audit_logs_csv_endpoint(
    request: Request,
    workspace_id: str = "default",
    format: str = "csv",
    user_id_filter: str | None = None,
    action_filter: AuditAction | None = None,
    status_filter: AuditStatus | None = None,
    severity_filter: SeverityLevel | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 5000,
    offset: int = 0,
    sort_by: str = "timestamp",
    x_user_id: str | None = Header(None, alias="X-User-ID"),
    session: AsyncSession = Depends(get_db),
) -> Response:
    """Export filtered audit logs as CSV for authorized roles."""
    if format.lower() != "csv":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV export is supported",
        )

    if limit < 1 or limit > 10000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 10000",
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

    await _require_audit_export_access(
        request=request,
        workspace_id=workspace_id,
        session=session,
        x_user_id=x_user_id,
    )

    remaining = limit
    current_offset = offset
    export_logs = []

    while remaining > 0:
        chunk_size = min(remaining, 500)
        logs_response = await get_audit_logs(
            AuditLogsRequest(
                workspace_id=workspace_id,
                user_id_filter=user_id_filter,
                action_filter=action_filter,
                status_filter=status_filter,
                severity_filter=severity_filter,
                start_date=start_date,
                end_date=end_date,
                limit=chunk_size,
                offset=current_offset,
                sort_by=sort_by,
            ),
            session,
        )

        export_logs.extend(logs_response.logs)

        if not logs_response.has_more:
            break

        fetched = len(logs_response.logs)
        if fetched == 0:
            break

        current_offset += fetched
        remaining -= fetched

    csv_content = _render_audit_logs_csv(export_logs)
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    filename = f"audit-trail-{workspace_id}-{timestamp}.csv"

    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
