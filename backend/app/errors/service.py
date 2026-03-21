"""
Error monitoring service (FR029).

Provides functions to query, filter, and manage error logs.
"""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import datetime
from typing import List, Dict, Optional, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.errors.schemas import (
    ErrorLog as ErrorLogSchema,
    ErrorLogsRequest,
    ErrorLogsResponse,
    ErrorStats,
)
from app.models import ErrorLog as ErrorLogORM

logger = logging.getLogger(__name__)


async def get_error_logs(
    request: ErrorLogsRequest,
    session: AsyncSession,
) -> ErrorLogsResponse:
    """
    Retrieve error logs with filtering and pagination.

    Args:
        request: ErrorLogsRequest with filters and pagination
        session: AsyncSession for database queries

    Returns:
        ErrorLogsResponse with logs, pagination info, and summary
    """
    logger.info(
        "Retrieving error logs: workspace=%s source=%s severity=%s status=%s",
        request.workspace_id,
        request.source_filter,
        request.severity_filter,
        request.status_filter,
    )

    # Build query
    query = select(ErrorLogORM)

    # Apply workspace filter
    if request.workspace_id:
        query = query.where(ErrorLogORM.workspace_id == request.workspace_id)

    # Apply source filter
    if request.source_filter:
        query = query.where(ErrorLogORM.source == request.source_filter.value)

    # Apply severity filter
    if request.severity_filter:
        query = query.where(ErrorLogORM.severity == request.severity_filter.value)

    # Apply status filter
    if request.status_filter:
        query = query.where(ErrorLogORM.status == request.status_filter.value)

    # Apply error type filter
    if request.error_type_filter:
        query = query.where(ErrorLogORM.error_type == request.error_type_filter)

    # Apply date range filters
    if request.start_date:
        query = query.where(ErrorLogORM.created_at >= request.start_date)
    if request.end_date:
        query = query.where(ErrorLogORM.created_at <= request.end_date)

    # Get total count (before pagination)
    count_query = query.with_only_columns(func.count()).select_from(ErrorLogORM)
    total = await session.scalar(count_query)

    # Sort
    if request.sort_by == "timestamp":
        query = query.order_by(ErrorLogORM.created_at.desc())
    elif request.sort_by == "severity":
        query = query.order_by(ErrorLogORM.severity.desc())
    elif request.sort_by == "source":
        query = query.order_by(ErrorLogORM.source)

    # Pagination
    query = query.limit(request.limit).offset(request.offset)

    # Execute query
    result = await session.execute(query)
    db_errors = result.scalars().all()

    # Convert to Pydantic schema
    errors = [
        ErrorLogSchema(
            id=err.id,
            error_code=err.error_code,
            error_type=err.error_type,
            source=err.source,
            operation=err.operation,
            workspace_id=err.workspace_id,
            user_id=err.user_id,
            message=err.message,
            stack_trace=err.stack_trace,
            request_data=err.request_data,
            task_data=err.task_data,
            severity=err.severity,
            status=err.status,
            resolved_at=err.resolved_at,
            resolved_by=err.resolved_by,
            resolution_notes=err.resolution_notes,
            created_at=err.created_at,
        )
        for err in db_errors
    ]

    return ErrorLogsResponse(
        errors=errors,
        total=total,
        limit=request.limit,
        offset=request.offset,
        has_more=(request.offset + request.limit) < total,
        summary=_compute_summary(errors),
    )


async def get_error_stats(
    workspace_id: Optional[str],
    session: AsyncSession,
) -> ErrorStats:
    """
    Get error statistics summary.

    Args:
        workspace_id: Workspace to filter by (optional)
        session: AsyncSession for database queries

    Returns:
        ErrorStats with summary metrics
    """
    logger.info("Generating error stats for workspace=%s", workspace_id)

    # Query all recent errors (last 10000 to avoid huge loads)
    query = select(ErrorLogORM).order_by(ErrorLogORM.created_at.desc()).limit(10000)

    if workspace_id:
        query = query.where(ErrorLogORM.workspace_id == workspace_id)

    result = await session.execute(query)
    db_errors = result.scalars().all()

    # Convert to schemas
    errors = [
        ErrorLogSchema(
            id=err.id,
            error_code=err.error_code,
            error_type=err.error_type,
            source=err.source,
            operation=err.operation,
            workspace_id=err.workspace_id,
            user_id=err.user_id,
            message=err.message,
            stack_trace=err.stack_trace,
            request_data=err.request_data,
            task_data=err.task_data,
            severity=err.severity,
            status=err.status,
            resolved_at=err.resolved_at,
            resolved_by=err.resolved_by,
            resolution_notes=err.resolution_notes,
            created_at=err.created_at,
        )
        for err in db_errors
    ]

    # Count totals
    total_errors = len(errors)
    total_critical = sum(1 for e in errors if e.severity == "critical")
    total_new = sum(1 for e in errors if e.status == "new")

    # Count by categories
    by_source = Counter(e.source for e in errors)
    by_severity = Counter(e.severity for e in errors)
    by_type = Counter(e.error_type for e in errors)

    return ErrorStats(
        total_errors=total_errors,
        total_critical=total_critical,
        total_in_new_status=total_new,
        by_source=dict(by_source),
        by_severity=dict(by_severity),
        by_type=dict(by_type),
        recent_errors=errors[:5],  # Top 5 recent errors
    )


def _compute_summary(errors: List[ErrorLogSchema]) -> Dict[str, Any]:
    """Compute summary statistics for error logs."""
    if not errors:
        return {
            "total_count": 0,
            "by_source": {},
            "by_severity": {},
            "by_status": {},
        }

    source_counts = Counter(e.source for e in errors)
    severity_counts = Counter(e.severity for e in errors)
    status_counts = Counter(e.status for e in errors)

    return {
        "total_count": len(errors),
        "by_source": dict(source_counts),
        "by_severity": dict(severity_counts),
        "by_status": dict(status_counts),
    }


async def update_error_status(
    error_id: str,
    status: str,
    resolution_notes: Optional[str],
    resolved_by: Optional[str],
    session: AsyncSession,
) -> Optional[ErrorLogSchema]:
    """
    Update error status and resolution notes.

    Args:
        error_id: ID of error to update
        status: New status value
        resolution_notes: Optional notes about resolution
        resolved_by: User ID who resolved the error
        session: AsyncSession for database queries

    Returns:
        Updated ErrorLog schema or None if not found
    """
    logger.info("Updating error_id=%s to status=%s", error_id, status)

    query = select(ErrorLogORM).where(ErrorLogORM.id == error_id)
    result = await session.execute(query)
    error = result.scalars().first()

    if not error:
        return None

    error.status = status
    error.resolution_notes = resolution_notes
    error.resolved_by = resolved_by

    if status == "resolved":
        error.resolved_at = datetime.utcnow()

    await session.commit()

    return ErrorLogSchema(
        id=error.id,
        error_code=error.error_code,
        error_type=error.error_type,
        source=error.source,
        operation=error.operation,
        workspace_id=error.workspace_id,
        user_id=error.user_id,
        message=error.message,
        stack_trace=error.stack_trace,
        request_data=error.request_data,
        task_data=error.task_data,
        severity=error.severity,
        status=error.status,
        resolved_at=error.resolved_at,
        resolved_by=error.resolved_by,
        resolution_notes=error.resolution_notes,
        created_at=error.created_at,
    )
