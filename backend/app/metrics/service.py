"""
Performance monitoring service (FR030).

Provides functions to record, query, and analyze performance metrics.
"""

from __future__ import annotations

import logging
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from typing import List, Dict, Optional, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.metrics.schemas import (
    PerformanceMetricLog as PerformanceMetricSchema,
    PerformanceMetricsRequest,
    PerformanceMetricsResponse,
    PerformanceStats,
    PerformanceHealthCheck,
)
from app.models import PerformanceMetric as PerformanceMetricORM

logger = logging.getLogger(__name__)


async def record_metric(
    session: AsyncSession,
    operation: str,
    source: str,
    duration_ms: float,
    workspace_id: Optional[str] = None,
    user_id: Optional[str] = None,
    endpoint: Optional[str] = None,
    result_count: Optional[int] = None,
    tokens_used: Optional[int] = None,
    model_name: Optional[str] = None,
    phase_durations: Optional[Dict[str, float]] = None,
    metric_data: Optional[Dict[str, Any]] = None,
    status: str = "success",
) -> str:
    """
    Record a performance metric.

    Args:
        session: AsyncSession for database operations
        operation: Type of operation (rag_chat, retrieval_query, etc.)
        source: Source of operation (api, rag, celery, etc.)
        duration_ms: Total duration in milliseconds
        workspace_id: Optional workspace context
        user_id: Optional user context
        endpoint: HTTP endpoint for API requests
        result_count: Number of results returned
        tokens_used: Total tokens used (for LLM operations)
        model_name: Model used (gpt-4, claude-opus, etc.)
        phase_durations: Breakdown by operation phases
        metric_data: Additional operation-specific metrics
        status: Operation status (success, partial, error)

    Returns:
        ID of created metric record
    """
    import uuid

    metric_id = str(uuid.uuid4())

    metric = PerformanceMetricORM(
        id=metric_id,
        workspace_id=workspace_id,
        user_id=user_id,
        operation=operation,
        endpoint=endpoint,
        source=source,
        duration_ms=duration_ms,
        phase_durations=phase_durations,
        result_count=result_count,
        tokens_used=tokens_used,
        model_name=model_name,
        metric_data=metric_data,
        status=status,
    )
    session.add(metric)
    await session.commit()

    logger.debug(
        "Performance metric recorded: operation=%s duration=%fms source=%s",
        operation,
        duration_ms,
        source,
    )

    return metric_id


async def get_performance_metrics(
    request: PerformanceMetricsRequest,
    session: AsyncSession,
) -> PerformanceMetricsResponse:
    """
    Retrieve performance metrics with filtering and pagination.

    Args:
        request: PerformanceMetricsRequest with filters and pagination
        session: AsyncSession for database queries

    Returns:
        PerformanceMetricsResponse with metrics, pagination info, and summary
    """
    logger.info(
        "Retrieving performance metrics: workspace=%s operation=%s source=%s",
        request.workspace_id,
        request.operation_filter,
        request.source_filter,
    )

    # Build query
    query = select(PerformanceMetricORM)

    # Apply workspace filter
    if request.workspace_id:
        query = query.where(PerformanceMetricORM.workspace_id == request.workspace_id)

    # Apply operation filter
    if request.operation_filter:
        query = query.where(PerformanceMetricORM.operation == request.operation_filter)

    # Apply source filter
    if request.source_filter:
        query = query.where(PerformanceMetricORM.source == request.source_filter)

    # Apply endpoint filter
    if request.endpoint_filter:
        query = query.where(PerformanceMetricORM.endpoint == request.endpoint_filter)

    # Apply date range filters
    if request.start_date:
        query = query.where(PerformanceMetricORM.created_at >= request.start_date)
    if request.end_date:
        query = query.where(PerformanceMetricORM.created_at <= request.end_date)

    # Get total count
    count_query = select(func.count()).select_from(PerformanceMetricORM)
    for clause in query.whereclause.clauses if query.whereclause else []:
        count_query = count_query.where(clause)
    total = await session.scalar(count_query)

    # Sort
    if request.sort_by == "timestamp":
        query = query.order_by(PerformanceMetricORM.created_at.desc())
    elif request.sort_by == "duration":
        query = query.order_by(PerformanceMetricORM.duration_ms.desc())
    elif request.sort_by == "operation":
        query = query.order_by(PerformanceMetricORM.operation)

    # Pagination
    query = query.limit(request.limit).offset(request.offset)

    # Execute query
    result = await session.execute(query)
    db_metrics = result.scalars().all()

    # Convert to Pydantic schema
    metrics = [
        PerformanceMetricSchema(
            id=m.id,
            workspace_id=m.workspace_id,
            user_id=m.user_id,
            operation=m.operation,
            endpoint=m.endpoint,
            source=m.source,
            duration_ms=m.duration_ms,
            phase_durations=m.phase_durations,
            result_count=m.result_count,
            tokens_used=m.tokens_used,
            tokens_input=m.tokens_input,
            tokens_output=m.tokens_output,
            model_name=m.model_name,
            batch_size=m.batch_size,
            embedding_dim=m.embedding_dim,
            query_time_ms=m.query_time_ms,
            rerank_score=m.rerank_score,
            status=m.status,
            quality_score=m.quality_score,
            metric_data=m.metric_data,
            created_at=m.created_at,
        )
        for m in db_metrics
    ]

    return PerformanceMetricsResponse(
        metrics=metrics,
        total=total,
        limit=request.limit,
        offset=request.offset,
        has_more=(request.offset + request.limit) < total,
        summary=_compute_summary(metrics),
    )


async def get_performance_stats(
    workspace_id: Optional[str],
    session: AsyncSession,
) -> PerformanceStats:
    """
    Get performance statistics summary.

    Args:
        workspace_id: Workspace to filter by (optional)
        session: AsyncSession for database queries

    Returns:
        PerformanceStats with summary metrics
    """
    logger.info("Generating performance stats for workspace=%s", workspace_id)

    # Query all recent metrics (last 10000 to avoid huge loads)
    query = select(PerformanceMetricORM).order_by(PerformanceMetricORM.created_at.desc()).limit(10000)

    if workspace_id:
        query = query.where(PerformanceMetricORM.workspace_id == workspace_id)

    result = await session.execute(query)
    db_metrics = result.scalars().all()

    # Convert to schemas
    metrics = [
        PerformanceMetricSchema(
            id=m.id,
            workspace_id=m.workspace_id,
            user_id=m.user_id,
            operation=m.operation,
            endpoint=m.endpoint,
            source=m.source,
            duration_ms=m.duration_ms,
            phase_durations=m.phase_durations,
            result_count=m.result_count,
            tokens_used=m.tokens_used,
            tokens_input=m.tokens_input,
            tokens_output=m.tokens_output,
            model_name=m.model_name,
            batch_size=m.batch_size,
            embedding_dim=m.embedding_dim,
            query_time_ms=m.query_time_ms,
            rerank_score=m.rerank_score,
            status=m.status,
            quality_score=m.quality_score,
            metric_data=m.metric_data,
            created_at=m.created_at,
        )
        for m in db_metrics
    ]

    if not metrics:
        return PerformanceStats(
            total_requests=0,
            avg_duration_ms=0,
            min_duration_ms=0,
            max_duration_ms=0,
            p50_duration_ms=0,
            p95_duration_ms=0,
            p99_duration_ms=0,
        )

    # Calculate duration statistics
    durations = [m.duration_ms for m in metrics]
    durations_sorted = sorted(durations)

    avg_duration = statistics.mean(durations)
    min_duration = min(durations)
    max_duration = max(durations)
    p50_duration = durations_sorted[len(durations_sorted) // 2]
    p95_duration = durations_sorted[int(len(durations_sorted) * 0.95)] if len(durations_sorted) > 0 else 0
    p99_duration = durations_sorted[int(len(durations_sorted) * 0.99)] if len(durations_sorted) > 0 else 0

    # Group by operation
    by_operation = defaultdict(lambda: {"count": 0, "avg_duration": 0})
    for m in metrics:
        by_operation[m.operation]["count"] += 1
        by_operation[m.operation]["avg_duration"] += m.duration_ms

    for op in by_operation:
        by_operation[op]["avg_duration"] /= by_operation[op]["count"]

    # Group by endpoint
    by_endpoint = defaultdict(lambda: {"count": 0, "avg_duration": 0})
    for m in metrics:
        if m.endpoint:
            by_endpoint[m.endpoint]["count"] += 1
            by_endpoint[m.endpoint]["avg_duration"] += m.duration_ms

    for ep in by_endpoint:
        by_endpoint[ep]["avg_duration"] /= by_endpoint[ep]["count"]

    # Group by source
    by_source = Counter(m.source for m in metrics)

    # Calculate token and result statistics
    tokens_list = [m.tokens_used for m in metrics if m.tokens_used]
    avg_tokens = statistics.mean(tokens_list) if tokens_list else None

    result_counts = [m.result_count for m in metrics if m.result_count]
    avg_result_count = statistics.mean(result_counts) if result_counts else None

    quality_scores = [m.quality_score for m in metrics if m.quality_score]
    avg_quality = statistics.mean(quality_scores) if quality_scores else None

    return PerformanceStats(
        total_requests=len(metrics),
        avg_duration_ms=avg_duration,
        min_duration_ms=min_duration,
        max_duration_ms=max_duration,
        p50_duration_ms=p50_duration,
        p95_duration_ms=p95_duration,
        p99_duration_ms=p99_duration,
        by_operation=dict(by_operation),
        by_endpoint=dict(by_endpoint),
        by_source=dict(by_source),
        avg_tokens_used=avg_tokens,
        avg_result_count=avg_result_count,
        quality_score_avg=avg_quality,
    )


async def get_performance_health(
    workspace_id: Optional[str],
    session: AsyncSession,
) -> PerformanceHealthCheck:
    """
    Get system performance health status.

    Analyzes recent metrics to determine if system is healthy, degraded, or critical.

    Args:
        workspace_id: Workspace to filter by (optional)
        session: AsyncSession for database queries

    Returns:
        PerformanceHealthCheck with health status and recommendations
    """
    logger.info("Getting performance health for workspace=%s", workspace_id)

    stats = await get_performance_stats(workspace_id, session)

    # Determine health status based on p95 latency
    # Healthy: < 1000ms
    # Degraded: 1000-3000ms
    # Critical: > 3000ms
    if stats.p95_duration_ms < 1000:
        health_status = "healthy"
    elif stats.p95_duration_ms < 3000:
        health_status = "degraded"
    else:
        health_status = "critical"

    # Find slow endpoints
    slow_endpoints = [
        {"endpoint": ep, "avg_duration_ms": stats_dict["avg_duration"]}
        for ep, stats_dict in stats.by_endpoint.items()
        if stats_dict["avg_duration"] > 2000
    ]
    slow_endpoints.sort(key=lambda x: x["avg_duration_ms"], reverse=True)

    # Find slow operations
    slow_operations = [
        {"operation": op, "avg_duration_ms": stats_dict["avg_duration"]}
        for op, stats_dict in stats.by_operation.items()
        if stats_dict["avg_duration"] > 2000
    ]
    slow_operations.sort(key=lambda x: x["avg_duration_ms"], reverse=True)

    # Generate recommendations
    recommendations = []
    if health_status != "healthy":
        if slow_endpoints:
            recommendations.append(f"Optimize {slow_endpoints[0]['endpoint']} - avg latency {slow_endpoints[0]['avg_duration_ms']:.0f}ms")
        if slow_operations:
            recommendations.append(f"Investigate {slow_operations[0]['operation']} operation - avg latency {slow_operations[0]['avg_duration_ms']:.0f}ms")
        if stats.p95_duration_ms > 3000:
            recommendations.append("Consider scaling or caching frequently requested data")

    return PerformanceHealthCheck(
        status=health_status,
        avg_api_latency_ms=stats.avg_duration_ms,
        p95_api_latency_ms=stats.p95_duration_ms,
        slow_endpoints=slow_endpoints[:5],
        slow_operations=slow_operations[:5],
        recommendations=recommendations,
    )


async def get_risk_distribution(
    workspace_id: Optional[str],
    session: AsyncSession,
) -> "RiskDistributionResponse":
    """
    Get risk assessment distribution statistics.

    Queries the database for risk assessments and calculates distribution
    across Low, Medium, High, Critical categories.

    Args:
        workspace_id: Workspace to filter by (optional)
        session: AsyncSession for database queries

    Returns:
        RiskDistributionResponse with distribution data
    """
    from app.metrics.schemas import RiskDistributionResponse, RiskDistributionItem
    from collections import Counter

    logger.info("Getting risk distribution for workspace=%s", workspace_id)

    # Query all recent metrics with risk assessment data
    query = select(PerformanceMetricORM).order_by(PerformanceMetricORM.created_at.desc()).limit(5000)

    if workspace_id:
        query = query.where(PerformanceMetricORM.workspace_id == workspace_id)

    # Filter for risk assessment operations
    query = query.where(PerformanceMetricORM.operation == "risk_assessment")

    result = await session.execute(query)
    db_metrics = result.scalars().all()

    # Extract risk levels from metric_data
    risk_levels = []
    for m in db_metrics:
        if m.metric_data and "risk_level" in m.metric_data:
            risk_levels.append(m.metric_data["risk_level"])

    if not risk_levels:
        # Return demo distribution if no real data
        return RiskDistributionResponse(
            total_assessments=0,
            distribution=[
                RiskDistributionItem(level="Low", count=0, percentage=0.0),
                RiskDistributionItem(level="Medium", count=0, percentage=0.0),
                RiskDistributionItem(level="High", count=0, percentage=0.0),
                RiskDistributionItem(level="Critical", count=0, percentage=0.0),
            ],
        )

    # Count risk levels
    risk_counts = Counter(risk_levels)
    total = len(risk_levels)

    distribution = [
        RiskDistributionItem(
            level=level,
            count=risk_counts.get(level, 0),
            percentage=round((risk_counts.get(level, 0) / total * 100), 1) if total > 0 else 0,
        )
        for level in ["Low", "Medium", "High", "Critical"]
    ]

    by_op = Counter(m.operation for m in db_metrics)

    return RiskDistributionResponse(
        total_assessments=total,
        distribution=distribution,
        by_operation=dict(by_op),
    )


async def get_document_processing_stats(
    workspace_id: Optional[str],
    session: AsyncSession,
) -> "DocumentProcessingStats":
    """
    Get document processing statistics.

    Queries PostgreSQL for document processing information including
    documents indexed today, total indexed, processing, failed counts.

    Args:
        workspace_id: Workspace to filter by (optional)
        session: AsyncSession for database queries

    Returns:
        DocumentProcessingStats with processing metrics
    """
    from app.metrics.schemas import DocumentProcessingStats
    from datetime import datetime, timedelta

    logger.info("Getting document processing stats for workspace=%s", workspace_id)

    # Import Document model
    try:
        from app.models import Document
    except ImportError:
        logger.warning("Document model not found, returning empty stats")
        return DocumentProcessingStats(
            indexed_today=0,
            total_indexed=0,
            processing=0,
            failed=0,
            average_processing_time_ms=0.0,
        )

    # Query documents from the past 24 hours (indexed today)
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)

    query_today = select(func.count()).select_from(Document)
    if workspace_id:
        query_today = query_today.where(Document.workspace_id == workspace_id)
    query_today = query_today.where(
        and_(
            Document.status == "indexed",
            Document.updated_at >= yesterday,
        )
    )
    indexed_today = await session.scalar(query_today) or 0

    # Total indexed
    query_total = select(func.count()).select_from(Document)
    if workspace_id:
        query_total = query_total.where(Document.workspace_id == workspace_id)
    query_total = query_total.where(Document.status == "indexed")
    total_indexed = await session.scalar(query_total) or 0

    # Processing
    query_processing = select(func.count()).select_from(Document)
    if workspace_id:
        query_processing = query_processing.where(Document.workspace_id == workspace_id)
    query_processing = query_processing.where(Document.status == "processing")
    processing = await session.scalar(query_processing) or 0

    # Failed
    query_failed = select(func.count()).select_from(Document)
    if workspace_id:
        query_failed = query_failed.where(Document.workspace_id == workspace_id)
    query_failed = query_failed.where(Document.status == "failed")
    failed = await session.scalar(query_failed) or 0

    # Average processing time (from metrics)
    query_metrics = select(PerformanceMetricORM).where(
        PerformanceMetricORM.operation == "document_ingest"
    )
    if workspace_id:
        query_metrics = query_metrics.where(PerformanceMetricORM.workspace_id == workspace_id)
    result = await session.execute(query_metrics.limit(100))
    metrics = result.scalars().all()

    avg_time = 0.0
    if metrics:
        durations = [m.duration_ms for m in metrics]
        avg_time = sum(durations) / len(durations)

    return DocumentProcessingStats(
        indexed_today=indexed_today,
        total_indexed=total_indexed,
        processing=processing,
        failed=failed,
        average_processing_time_ms=avg_time,
    )


async def get_query_analytics(
    workspace_id: Optional[str],
    session: AsyncSession,
    top_n: int = 5,
) -> "QueryAnalytics":
    """
    Get query analytics summary.

    Analyzes audit logs to extract top queries and hourly distribution.

    Args:
        workspace_id: Workspace to filter by (optional)
        session: AsyncSession for database queries
        top_n: Number of top queries to return (default 5)

    Returns:
        QueryAnalytics with top queries and hourly distribution
    """
    from app.metrics.schemas import QueryAnalytics, AnalyticsQuery
    from app.models import AuditLog

    logger.info("Getting query analytics for workspace=%s", workspace_id)

    # Query audit logs for chat queries
    query = select(AuditLog).where(AuditLog.action == "CHAT_QUERY")
    if workspace_id:
        query = query.where(AuditLog.workspace_id == workspace_id)

    result = await session.execute(query.limit(1000))
    audit_logs = result.scalars().all()

    # Extract query texts and calculate frequencies
    query_texts = []
    for log in audit_logs:
        if log.meta_data and isinstance(log.meta_data, dict):
            if "query_text" in log.meta_data:
                query_texts.append(log.meta_data["query_text"])
        elif hasattr(log, "meta_data") and hasattr(log.meta_data, "query_text"):
            query_texts.append(log.meta_data.query_text)

    query_counts = Counter(query_texts) if query_texts else Counter()
    total_queries = len(query_texts)

    # Build top queries
    most_common = [
        AnalyticsQuery(
            query_text=q,
            count=count,
            percentage=round((count / total_queries * 100), 1) if total_queries > 0 else 0,
        )
        for q, count in query_counts.most_common(top_n)
    ]

    # Calculate hourly distribution
    by_hour = defaultdict(int)
    for log in audit_logs:
        created_hour = log.created_at.strftime("%H:00") if log.created_at else "00:00"
        by_hour[created_hour] += 1

    return QueryAnalytics(
        total_queries=total_queries,
        most_common=most_common,
        by_hour=dict(sorted(by_hour.items())),
    )


def _compute_summary(metrics: List[PerformanceMetricSchema]) -> Dict[str, Any]:
    """Compute summary statistics for performance metrics."""
    if not metrics:
        return {
            "total_count": 0,
            "by_operation": {},
            "by_source": {},
            "by_status": {},
        }

    operation_counts = Counter(m.operation for m in metrics)
    source_counts = Counter(m.source for m in metrics)
    status_counts = Counter(m.status for m in metrics)

    return {
        "total_count": len(metrics),
        "by_operation": dict(operation_counts),
        "by_source": dict(source_counts),
        "by_status": dict(status_counts),
    }
