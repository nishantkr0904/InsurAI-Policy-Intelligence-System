"""
Error monitoring schemas (FR029).

Defines request/response structures for error monitoring endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


class ErrorSeverity(str, Enum):
    """Error severity levels."""
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ErrorStatus(str, Enum):
    """Error status values."""
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class ErrorSource(str, Enum):
    """Error source/origin."""
    API = "api"
    CELERY = "celery"
    INGESTION = "ingestion"
    EMBEDDING = "embedding"
    INDEXING = "indexing"
    LLM = "llm"
    MINIO = "minio"
    MILVUS = "milvus"


class ErrorLog(BaseModel):
    """Represents a single error log entry."""

    id: str
    error_code: Optional[str] = None
    error_type: str = Field(..., description="Python exception type")
    source: str = Field(..., description="Error source (api, celery, etc.)")
    operation: str = Field(..., description="Failed operation")
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    message: str = Field(..., description="Error message")
    stack_trace: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    task_data: Optional[Dict[str, Any]] = None
    severity: str = Field(default="error", description="error, warning, critical")
    status: str = Field(default="new", description="New, acknowledged, resolved, etc.")
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ErrorLogsRequest(BaseModel):
    """Request to list error logs."""

    workspace_id: Optional[str] = None
    source_filter: Optional[ErrorSource] = Field(None, description="Filter by source")
    severity_filter: Optional[ErrorSeverity] = Field(None, description="Filter by severity")
    status_filter: Optional[ErrorStatus] = Field(None, description="Filter by status")
    error_type_filter: Optional[str] = Field(None, description="Filter by error type")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=50, le=500)
    offset: int = Field(default=0, ge=0)
    sort_by: str = Field(default="timestamp", description="timestamp, severity, source")


class ErrorLogsResponse(BaseModel):
    """Response with list of error logs."""

    errors: List[ErrorLog]
    total: int
    limit: int
    offset: int
    has_more: bool
    summary: Dict[str, Any] = Field(default_factory=dict)


class ErrorStats(BaseModel):
    """Error statistics summary."""

    total_errors: int
    total_critical: int
    total_in_new_status: int
    by_source: Dict[str, int] = Field(default_factory=dict)
    by_severity: Dict[str, int] = Field(default_factory=dict)
    by_type: Dict[str, int] = Field(default_factory=dict)
    recent_errors: List[ErrorLog]


class UpdateErrorStatusRequest(BaseModel):
    """Request to update error status."""

    status: ErrorStatus
    resolution_notes: Optional[str] = None
