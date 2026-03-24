"""
Pydantic schemas for health monitoring endpoints.
"""

from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ServiceHealth(BaseModel):
    """Health status of a single service."""
    name: str = Field(..., description="Service name (AI, Vector DB, Queue, etc)")
    status: str = Field(..., description="Status: healthy, degraded, down")
    latency_ms: Optional[int] = Field(None, description="Service latency in ms")
    last_checked: str = Field(..., description="ISO timestamp of last check")
    error_message: Optional[str] = Field(None, description="Error details if down")


class SystemHealthResponse(BaseModel):
    """Overall system health status."""
    overall_status: str = Field(..., description="healthy, degraded, down")
    timestamp: str = Field(..., description="ISO timestamp")
    services: List[ServiceHealth] = Field(..., description="Individual service statuses")
    recommendations: List[str] = Field(default_factory=list, description="Actions to restore health")


class EdgeCaseWarning(BaseModel):
    """Warning about a potential edge case or data quality issue."""
    warning_type: str = Field(..., description="low_confidence, conflicting_data, no_data, processing_failed")
    severity: str = Field(..., description="info, warning, error")
    message: str = Field(..., description="Human-readable warning")
    affected_documents: List[str] = Field(default_factory=list, description="Document IDs affected")
    recommended_action: Optional[str] = Field(None, description="Suggested user action")


class QueryDiagnostics(BaseModel):
    """Diagnostics for a chat query response."""
    query: str
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Retrieval confidence 0-1")
    retrieved_chunks: int
    has_conflicting_sources: bool = Field(..., description="Multiple sources with conflicting info")
    warnings: List[EdgeCaseWarning] = Field(default_factory=list)
    confidence_category: str = Field(..., description="high (>0.8), medium (0.6-0.8), low (<0.6)")
