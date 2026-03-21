"""
Performance timing utilities (FR030).

Provides utilities to measure and record performance metrics.
"""

from __future__ import annotations

import asyncio
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.metrics.service import record_metric

logger = logging.getLogger(__name__)


@asynccontextmanager
async def measure_performance(
    operation: str,
    source: str,
    session: AsyncSession,
    workspace_id: Optional[str] = None,
    user_id: Optional[str] = None,
    endpoint: Optional[str] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Async context manager to measure operation performance.

    Automatically records duration and allows setting additional metrics.

    Usage:
        async with measure_performance(
            operation="rag_chat",
            source="rag",
            session=session,
            workspace_id="workspace-id",
            user_id="user-id",
            endpoint="POST /api/v1/chat",
        ) as metrics:
            # Perform operation
            result = await some_operation()
            # Record additional metrics
            metrics["result_count"] = len(result)
            metrics["tokens_used"] = token_count

    Args:
        operation: Type of operation being measured
        source: Source/component of operation
        session: AsyncSession for recording metrics
        workspace_id: Optional workspace context
        user_id: Optional user context
        endpoint: Optional HTTP endpoint
        phase_durations: Optional breakdown by phases

    Yields:
        Dictionary to store additional metrics before context exit
    """
    start_time = time.perf_counter()
    metrics_dict = {}

    try:
        yield metrics_dict
    finally:
        end_time = time.perf_counter()
        duration_ms = (end_time - start_time) * 1000

        # Extract optional metrics
        result_count = metrics_dict.get("result_count")
        tokens_used = metrics_dict.get("tokens_used")
        tokens_input = metrics_dict.get("tokens_input")
        tokens_output = metrics_dict.get("tokens_output")
        model_name = metrics_dict.get("model_name")
        batch_size = metrics_dict.get("batch_size")
        embedding_dim = metrics_dict.get("embedding_dim")
        query_time_ms = metrics_dict.get("query_time_ms")
        rerank_score = metrics_dict.get("rerank_score")
        quality_score = metrics_dict.get("quality_score")
        phase_durations = metrics_dict.get("phase_durations")
        metric_data = metrics_dict.get("metric_data")
        status = metrics_dict.get("status", "success")

        # Record metric asynchronously (non-blocking)
        try:
            await record_metric(
                session=session,
                operation=operation,
                source=source,
                duration_ms=duration_ms,
                workspace_id=workspace_id,
                user_id=user_id,
                endpoint=endpoint,
                result_count=result_count,
                tokens_used=tokens_used,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                model_name=model_name,
                batch_size=batch_size,
                embedding_dim=embedding_dim,
                query_time_ms=query_time_ms,
                rerank_score=rerank_score,
                metric_data=metric_data,
                phase_durations=phase_durations,
                status=status,
                quality_score=quality_score,
            )

            logger.debug(
                "Performance metric recorded: operation=%s duration=%fms",
                operation,
                duration_ms,
            )
        except Exception as exc:
            logger.warning(
                "Failed to record performance metric for %s: %s",
                operation,
                exc,
            )


def measure_performance_sync(
    operation: str,
    source: str,
    session: AsyncSession,
    workspace_id: Optional[str] = None,
    user_id: Optional[str] = None,
    endpoint: Optional[str] = None,
):
    """
    Synchronous Performance timing context manager.

    Similar to measure_performance but for sync code.

    Usage:
        with measure_performance_sync(...) as metrics:
            result = some_operation()
            metrics["result_count"] = len(result)
    """
    from contextlib import contextmanager

    @contextmanager
    def _timer():
        start_time = time.perf_counter()
        metrics_dict = {}

        try:
            yield metrics_dict
        finally:
            end_time = time.perf_counter()
            duration_ms = (end_time - start_time) * 1000

            # Schedule async recording in event loop
            try:
                metrics_dict_final = metrics_dict.copy()
                metrics_dict_final["duration_ms"] = duration_ms

                # Try to get running loop and schedule task
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    # No running loop, create one
                    loop = asyncio.new_event_loop()

                task = loop.create_task(
                    record_metric(
                        session=session,
                        operation=operation,
                        source=source,
                        duration_ms=duration_ms,
                        workspace_id=workspace_id,
                        user_id=user_id,
                        endpoint=endpoint,
                        result_count=metrics_dict.get("result_count"),
                        tokens_used=metrics_dict.get("tokens_used"),
                        model_name=metrics_dict.get("model_name"),
                        phase_durations=metrics_dict.get("phase_durations"),
                        metric_data=metrics_dict.get("metric_data"),
                        status=metrics_dict.get("status", "success"),
                    )
                )

                logger.debug(
                    "Performance metric recorded: operation=%s duration=%fms",
                    operation,
                    duration_ms,
                )
            except Exception as exc:
                logger.warning(
                    "Failed to record performance metric for %s: %s",
                    operation,
                    exc,
                )

    return _timer()
