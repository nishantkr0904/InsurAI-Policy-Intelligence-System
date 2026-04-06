"""
Health monitoring service implementation.

Provides system health checks, dependency verification, and diagnostics.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy import text

from app.health.schemas import ServiceHealth, SystemHealthResponse, EdgeCaseWarning, QueryDiagnostics

logger = logging.getLogger(__name__)


async def get_system_health() -> SystemHealthResponse:
    """
    Get overall system health status.
    
    Checks:
      - AI/LLM service connectivity
      - Vector DB (Milvus) availability
      - Task queue (Redis/Celery) status
      - Database connectivity
    
    Returns:
        SystemHealthResponse with all service statuses
    """
    services: List[ServiceHealth] = []
    now = datetime.utcnow().isoformat()
    
    # Check AI/LLM service
    ai_health = await _check_ai_service(now)
    services.append(ai_health)
    
    # Check Vector DB
    vector_db_health = await _check_vector_db(now)
    services.append(vector_db_health)
    
    # Check Task Queue
    queue_health = await _check_task_queue(now)
    services.append(queue_health)
    
    # Check Database
    db_health = await _check_database(now)
    services.append(db_health)
    
    # Determine overall status
    statuses = [s.status for s in services]
    if "down" in statuses:
        overall_status = "down"
    elif "degraded" in statuses:
        overall_status = "degraded"
    else:
        overall_status = "healthy"
    
    # Generate recommendations
    recommendations = _generate_recommendations(services)
    
    return SystemHealthResponse(
        overall_status=overall_status,
        timestamp=now,
        services=services,
        recommendations=recommendations,
    )


async def _check_ai_service(now: str) -> ServiceHealth:
    """Check AI/LLM service health (LiteLLM)."""
    started = time.perf_counter()
    try:
        # Lightweight readiness check for AI configuration.
        from app.core.config import settings
        latency_ms = max(1, int((time.perf_counter() - started) * 1000))
        
        llm_model = str(getattr(settings, "LLM_MODEL", "")).strip().lower()
        litellm_key = str(getattr(settings, "LITELLM_API_KEY", "")).strip()
        openai_key = str(getattr(settings, "OPENAI_API_KEY", "")).strip()

        api_key = litellm_key or openai_key

        # Remote OpenAI-style models require API key; local providers may not.
        needs_openai_key = llm_model.startswith("gpt") or llm_model.startswith("openai/")

        if needs_openai_key and not api_key:
            return ServiceHealth(
                name="AI Engine (LLM)",
                status="degraded",
                latency_ms=latency_ms,
                last_checked=now,
                error_message="AI Engine not configured",
            )
        
        return ServiceHealth(
            name="AI Engine (LLM)",
            status="healthy",
            latency_ms=latency_ms,
            last_checked=now,
            error_message=None,
        )
    except Exception as exc:
        logger.error("AI service health check failed: %s", exc)
        return ServiceHealth(
            name="AI Engine (LLM)",
            status="down",
            latency_ms=None,
            last_checked=now,
            error_message=str(exc),
        )


async def _check_vector_db(now: str) -> ServiceHealth:
    """Check Vector DB (Milvus) health."""
    started = time.perf_counter()
    try:
        # Perform a real Milvus connectivity probe.
        from app.processing.vector_store import _connect
        from pymilvus import utility

        _connect()
        utility.has_collection("_health_probe_collection")
        latency_ms = max(1, int((time.perf_counter() - started) * 1000))

        status = "healthy"
        if latency_ms > 1500:
            status = "degraded"

        return ServiceHealth(
            name="Vector DB (Milvus)",
            status=status,
            latency_ms=latency_ms,
            last_checked=now,
            error_message=None,
        )
    except Exception as exc:
        logger.error("Vector DB health check failed: %s", exc)
        return ServiceHealth(
            name="Vector DB (Milvus)",
            status="degraded",
            latency_ms=None,
            last_checked=now,
            error_message=str(exc),
        )


async def _check_task_queue(now: str) -> ServiceHealth:
    """Check Task Queue (Redis/Celery) health."""
    started = time.perf_counter()
    redis_client = None
    try:
        from redis import asyncio as aioredis
        from app.core.config import settings

        redis_client = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        pong = await redis_client.ping()
        latency_ms = max(1, int((time.perf_counter() - started) * 1000))

        if not pong:
            return ServiceHealth(
                name="Task Queue (Redis)",
                status="down",
                latency_ms=latency_ms,
                last_checked=now,
                error_message="Redis ping failed",
            )

        status = "healthy"
        if latency_ms > 800:
            status = "degraded"
        
        return ServiceHealth(
            name="Task Queue (Redis)",
            status=status,
            latency_ms=latency_ms,
            last_checked=now,
            error_message=None,
        )
    except Exception as exc:
        logger.error("Task queue health check failed: %s", exc)
        return ServiceHealth(
            name="Task Queue (Redis)",
            status="down",
            latency_ms=None,
            last_checked=now,
            error_message=str(exc),
        )
    finally:
        if redis_client is not None:
            await redis_client.aclose()


async def _check_database(now: str) -> ServiceHealth:
    """Check PostgreSQL database health."""
    started = time.perf_counter()
    try:
        from app.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        latency_ms = max(1, int((time.perf_counter() - started) * 1000))

        status = "healthy"
        if latency_ms > 1200:
            status = "degraded"
            
        return ServiceHealth(
            name="Database (PostgreSQL)",
            status=status,
            latency_ms=latency_ms,
            last_checked=now,
            error_message=None,
        )
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return ServiceHealth(
            name="Database (PostgreSQL)",
            status="down",
            latency_ms=None,
            last_checked=now,
            error_message=str(exc),
        )


def _generate_recommendations(services: List[ServiceHealth]) -> List[str]:
    """Generate remediation recommendations based on service status."""
    recommendations = []
    
    for service in services:
        if service.status == "down":
            if "LLM" in service.name:
                recommendations.append("Check LiteLLM configuration and API key")
            elif "Milvus" in service.name:
                recommendations.append("Verify Milvus container is running: docker ps | grep milvus")
            elif "Redis" in service.name:
                recommendations.append("Restart Redis service and Celery workers")
            elif "PostgreSQL" in service.name:
                recommendations.append("Check PostgreSQL connection string in environment")
        
        elif service.status == "degraded":
            if service.latency_ms and service.latency_ms > 1000:
                recommendations.append(f"{service.name} is slow (>{service.latency_ms}ms), check load/network")
    
    if not recommendations:
        recommendations.append("System is operating normally")
    
    return recommendations


def create_query_diagnostics(
    query: str,
    confidence: float,
    retrieved_chunks: int,
    warnings: Optional[List[EdgeCaseWarning]] = None,
) -> QueryDiagnostics:
    """
    Create diagnostics for a query response.
    
    Args:
        query: The user's query
        confidence: Confidence score 0-1
        retrieved_chunks: Number of chunks retrieved
        warnings: Optional list of warnings
    
    Returns:
        QueryDiagnostics with analysis
    """
    # Categorize confidence
    if confidence >= 0.8:
        category = "high"
    elif confidence >= 0.6:
        category = "medium"
    else:
        category = "low"
    
    # Detect conflicting sources (simplified: check if we have 2+ sources with low scores)
    has_conflict = False
    if retrieved_chunks >= 2 and confidence < 0.7:
        has_conflict = True
    
    return QueryDiagnostics(
        query=query,
        confidence_score=confidence,
        retrieved_chunks=retrieved_chunks,
        has_conflicting_sources=has_conflict,
        warnings=warnings or [],
        confidence_category=category,
    )


def create_low_confidence_warning(
    confidence: float,
    query: str,
) -> EdgeCaseWarning:
    """Create warning for low confidence query."""
    return EdgeCaseWarning(
        warning_type="low_confidence",
        severity="warning",
        message=f"Low confidence ({confidence:.0%}) in response. Policy documents may not fully cover this topic.",
        recommended_action="Try rephrasing your question or upload additional policy documents.",
    )


def create_conflicting_data_warning(
    conflicting_clauses: List[str],
    document_ids: List[str],
) -> EdgeCaseWarning:
    """Create warning for conflicting policy clauses."""
    return EdgeCaseWarning(
        warning_type="conflicting_data",
        severity="warning",
        message=f"Found {len(conflicting_clauses)} conflicting clauses in policies. Manual review recommended.",
        affected_documents=document_ids,
        recommended_action="Review the conflicting clauses section below and consult legal team if needed.",
    )


def create_no_data_warning(
    query: str,
) -> EdgeCaseWarning:
    """Create warning for no relevant data found."""
    return EdgeCaseWarning(
        warning_type="no_data",
        severity="error",
        message="No relevant information found in indexed policies.",
        recommended_action="Upload additional policy documents or try a different search term.",
    )


def create_processing_failed_warning(
    document_id: str,
    error_reason: str,
) -> EdgeCaseWarning:
    """Create warning for document processing failure."""
    return EdgeCaseWarning(
        warning_type="processing_failed",
        severity="error",
        message=f"Document processing failed: {error_reason}",
        affected_documents=[document_id],
        recommended_action="Try re-uploading the document or ensure it's in PDF/DOCX format.",
    )
