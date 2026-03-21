"""
Error monitoring API router (FR029).

Endpoints:
  - GET /api/v1/errors – List error logs
  - GET /api/v1/errors/stats – Error statistics summary
  - PUT /api/v1/errors/{error_id}/status – Update error status
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors.schemas import (
    ErrorLogsRequest,
    ErrorLogsResponse,
    ErrorStats,
    UpdateErrorStatusRequest,
)
from app.errors.service import (
    get_error_logs,
    get_error_stats,
    update_error_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/errors", tags=["Error Monitoring"])


@router.get(
    "",
    response_model=ErrorLogsResponse,
    summary="List error logs",
    description="Retrieve error logs with filtering and pagination",
)
async def list_error_logs(
    workspace_id: Optional[str] = None,
    source: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    error_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "timestamp",
    session: AsyncSession = Depends(get_db),
) -> ErrorLogsResponse:
    """
    Retrieve error logs with filtering and pagination.

    Query parameters:
      - workspace_id: Filter by workspace
      - source: Filter by error source (api, celery, ingestion, etc.)
      - severity: Filter by severity (warning, error, critical)
      - status: Filter by status (new, acknowledged, resolved, etc.)
      - error_type: Filter by exception type (ValueError, TimeoutError, etc.)
      - limit: Max results (default 50, max 500)
      - offset: Pagination offset (default 0)
      - sort_by: Sort key (timestamp, severity, source)
    """
    request = ErrorLogsRequest(
        workspace_id=workspace_id,
        source_filter=source,
        severity_filter=severity,
        status_filter=status,
        error_type_filter=error_type,
        limit=min(limit, 500),
        offset=offset,
        sort_by=sort_by,
    )

    return await get_error_logs(request, session)


@router.get(
    "/stats",
    response_model=ErrorStats,
    summary="Error statistics",
    description="Get error statistics summary",
)
async def get_errors_stats(
    workspace_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
) -> ErrorStats:
    """
    Get error statistics summary.

    Returns:
      - total_errors: Total error count
      - total_critical: Count of critical errors
      - total_in_new_status: Unacknowledged errors
      - by_source: Errors grouped by source
      - by_severity: Errors grouped by severity
      - by_type: Errors grouped by exception type
      - recent_errors: 5 most recent errors
    """
    return await get_error_stats(workspace_id, session)


@router.put(
    "/{error_id}/status",
    summary="Update error status",
    description="Update error status and resolution notes",
)
async def update_error(
    error_id: str,
    request: UpdateErrorStatusRequest,
    user_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Update error status and resolution details.

    Args:
      - error_id: ID of error to update
      - status: New status (new, acknowledged, investigating, resolved, ignored)
      - resolution_notes: Optional notes about the resolution
    """
    updated = await update_error_status(
        error_id=error_id,
        status=request.status.value,
        resolution_notes=request.resolution_notes,
        resolved_by=user_id,
        session=session,
    )

    if not updated:
        raise HTTPException(status_code=404, detail=f"Error {error_id} not found")

    return updated
