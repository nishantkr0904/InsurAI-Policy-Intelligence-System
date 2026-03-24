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


@router.get(
    "/risk-distribution",
    response_model="RiskDistributionResponse",
    summary="Risk distribution statistics",
    description="Get risk assessment distribution across Low/Medium/High/Critical",
)
async def get_risk_dist(
    workspace_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Get risk assessment distribution statistics.

    Returns distribution of risk assessments across risk levels:
      - Low: 0-30
      - Medium: 31-50
      - High: 51-75
      - Critical: 76-100

    Returns:
      - total_assessments: Total number of assessments
      - distribution: Distribution data for each risk level
      - by_operation: Count by operation type
    """
    from app.metrics.service import get_risk_distribution

    return await get_risk_distribution(workspace_id, session)


@router.get(
    "/documents",
    response_model="DocumentProcessingStats",
    summary="Document processing statistics",
    description="Get document indexing and processing metrics",
)
async def get_doc_stats(
    workspace_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Get document processing statistics.

    Returns:
      - indexed_today: Documents indexed in the last 24 hours
      - total_indexed: Total indexed documents
      - processing: Currently processing documents
      - failed: Failed documents
      - average_processing_time_ms: Average time to index a document
    """
    from app.metrics.service import get_document_processing_stats

    return await get_document_processing_stats(workspace_id, session)


@router.get(
    "/queries",
    response_model="QueryAnalytics",
    summary="Query analytics",
    description="Get top queries and hourly distribution",
)
async def get_query_stats(
    workspace_id: Optional[str] = None,
    top_n: int = 5,
    session: AsyncSession = Depends(get_db),
):
    """
    Get query analytics summary.

    Returns:
      - total_queries: Total number of queries
      - most_common: Top N most common queries with percentages
      - by_hour: Queries grouped by hour of day
    """
    from app.metrics.service import get_query_analytics

    return await get_query_analytics(workspace_id, session, top_n)
