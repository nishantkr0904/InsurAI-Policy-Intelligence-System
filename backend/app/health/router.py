"""
Health monitoring API endpoints.

Exposes:
  - GET /api/v1/health/status – System health check
  - GET /api/v1/health/diagnostics – Full health diagnostics
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, status

from app.health.schemas import SystemHealthResponse
from app.health.service import get_system_health

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/health", tags=["Health Monitoring"])


@router.get(
    "/status",
    response_model=SystemHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System health status check",
    description="Check overall system health and dependencies (AI, Vector DB, Queue, Database)",
)
async def health_status() -> SystemHealthResponse:
    """
    Get system health status.
    
    Checks:
      - AI/LLM service (LiteLLM)
      - Vector DB (Milvus)
      - Task Queue (Redis)
      - Database (PostgreSQL)
    
    Returns overall status and service-level details.
    """
    try:
        health = await get_system_health()
        logger.info("Health check completed: status=%s", health.overall_status)
        return health
    except Exception as exc:
        logger.error("Health check failed: %s", exc)
        # Return degraded status on error
        return SystemHealthResponse(
            overall_status="degraded",
            timestamp="",
            services=[],
            recommendations=["Health check service error. Check logs for details."],
        )
