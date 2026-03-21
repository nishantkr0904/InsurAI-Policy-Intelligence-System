"""
Performance monitoring API router (FR030).

Endpoints:
  - GET /api/v1/metrics – List performance metrics
  - GET /api/v1/metrics/stats – Performance statistics summary
  - GET /api/v1/metrics/health – System performance health check
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.metrics.schemas import (
    PerformanceMetricsRequest,
    PerformanceMetricsResponse,
    PerformanceStats,
    PerformanceHealthCheck,
)
from app.metrics.service import (
    get_performance_metrics,
    get_performance_stats,
    get_performance_health,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/metrics", tags=["Performance Monitoring"])


@router.get(
    "",
    response_model=PerformanceMetricsResponse,
    summary="List performance metrics",
    description="Retrieve performance metrics with filtering and pagination",
)
async def list_performance_metrics(
    workspace_id: Optional[str] = None,
    operation: Optional[str] = None,
    source: Optional[str] = None,
    endpoint: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "timestamp",
    session: AsyncSession = Depends(get_db),
) -> PerformanceMetricsResponse:
    """
    Retrieve performance metrics with filtering and pagination.

    Query parameters:
      - workspace_id: Filter by workspace
      - operation: Filter by operation type (rag_chat, api_request, etc.)
      - source: Filter by source (api, rag, celery, etc.)
      - endpoint: Filter by HTTP endpoint
      - limit: Max results (default 100, max 1000)
      - offset: Pagination offset (default 0)
      - sort_by: Sort key (timestamp, duration, operation)
    """
    request = PerformanceMetricsRequest(
        workspace_id=workspace_id,
        operation_filter=operation,
        source_filter=source,
        endpoint_filter=endpoint,
        limit=min(limit, 1000),
        offset=offset,
        sort_by=sort_by,
    )

    return await get_performance_metrics(request, session)


@router.get(
    "/stats",
    response_model=PerformanceStats,
    summary="Performance statistics",
    description="Get performance statistics summary",
)
async def get_metrics_stats(
    workspace_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
) -> PerformanceStats:
    """
    Get performance statistics summary.

    Returns:
      - total_requests: Total number of tracked operations
      - avg_duration_ms: Average operation duration
      - min/max_duration_ms: Min/max operation duration
      - p50/p95/p99_duration_ms: Percentile latencies
      - by_operation: Stats grouped by operation type
      - by_endpoint: Stats grouped by HTTP endpoint
      - by_source: Counts grouped by source
      - avg_tokens_used: Average LLM tokens per operation
      - avg_result_count: Average results returned
      - quality_score_avg: Average operation quality score
    """
    return await get_performance_stats(workspace_id, session)


@router.get(
    "/health",
    response_model=PerformanceHealthCheck,
    summary="Performance health check",
    description="Get system performance health status and recommendations",
)
async def get_metrics_health(
    workspace_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
) -> PerformanceHealthCheck:
    """
    Get system performance health status.

    Analyzes recent metrics to determine system health:
      - healthy: p95 latency < 1000ms
      - degraded: p95 latency 1000-3000ms
      - critical: p95 latency > 3000ms

    Returns:
      - status: Health status (healthy, degraded, critical)
      - avg_api_latency_ms: Average API latency
      - p95_api_latency_ms: 95th percentile latency
      - slow_endpoints: Top 5 slowest HTTP endpoints
      - slow_operations: Top 5 slowest operations
      - recommendations: Optimization recommendations based on health
    """
    return await get_performance_health(workspace_id, session)
