"""
Performance monitoring schemas (FR030).

Defines request/response structures for performance metrics endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


class PerformanceOperation(str, Enum):
    """Types of operations to track."""
    RAG_CHAT = "rag_chat"
    RETRIEVAL_QUERY = "retrieval_query"
    EMBEDDINGS = "embeddings"
    VECTOR_SEARCH = "vector_search"
    LLM_SYNTHESIS = "llm_synthesis"
    DOCUMENT_INGEST = "document_ingest"
    API_REQUEST = "api_request"


class PerformanceSource(str, Enum):
    """Source of the operation."""
    API = "api"
    RAG = "rag"
    CELERY = "celery"
    EMBEDDING = "embedding"
    MILVUS = "milvus"
    LLM = "llm"


class PerformanceMetricLog(BaseModel):
    """Represents a single performance metric record."""

    id: str
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    operation: str
    endpoint: Optional[str] = None
    source: str
    duration_ms: float = Field(..., description="Total duration in milliseconds")
    phase_durations: Optional[Dict[str, float]] = None
    result_count: Optional[int] = None
    tokens_used: Optional[int] = None
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    model_name: Optional[str] = None
    batch_size: Optional[int] = None
    embedding_dim: Optional[int] = None
    query_time_ms: Optional[float] = None
    rerank_score: Optional[float] = None
    status: str = Field(default="success")
    quality_score: Optional[float] = None
    metric_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PerformanceMetricsRequest(BaseModel):
    """Request to list performance metrics."""

    workspace_id: Optional[str] = None
    operation_filter: Optional[str] = Field(None, description="Filter by operation type")
    source_filter: Optional[str] = Field(None, description="Filter by source")
    endpoint_filter: Optional[str] = Field(None, description="Filter by endpoint")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)
    sort_by: str = Field(default="timestamp", description="timestamp, duration, operation")


class PerformanceMetricsResponse(BaseModel):
    """Response with list of performance metrics."""

    metrics: List[PerformanceMetricLog]
    total: int
    limit: int
    offset: int
    has_more: bool
    summary: Dict[str, Any] = Field(default_factory=dict)


class PerformanceStats(BaseModel):
    """Performance statistics summary."""

    total_requests: int
    avg_duration_ms: float
    min_duration_ms: float
    max_duration_ms: float
    p50_duration_ms: float
    p95_duration_ms: float
    p99_duration_ms: float
    by_operation: Dict[str, Any] = Field(default_factory=dict)
    by_endpoint: Dict[str, Any] = Field(default_factory=dict)
    by_source: Dict[str, Any] = Field(default_factory=dict)
    avg_tokens_used: Optional[float] = None
    avg_result_count: Optional[float] = None
    quality_score_avg: Optional[float] = None


class PerformanceHealthCheck(BaseModel):
    """System performance health status."""

    status: str = Field(..., description="healthy, degraded, critical")
    avg_api_latency_ms: float
    p95_api_latency_ms: float
    slow_endpoints: List[Dict[str, Any]] = Field(default_factory=list)
    slow_operations: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class RiskDistributionItem(BaseModel):
    """Risk distribution data point."""

    level: str = Field(..., description="Low, Medium, High, Critical")
    count: int = Field(..., description="Number of policies at this risk level")
    percentage: float = Field(..., description="Percentage of total")


class RiskDistributionResponse(BaseModel):
    """Risk distribution statistics."""

    total_assessments: int
    distribution: List[RiskDistributionItem]
    by_operation: Dict[str, int] = Field(default_factory=dict)


class DocumentProcessingStats(BaseModel):
    """Document processing statistics."""

    indexed_today: int = Field(..., description="Documents indexed in the last 24 hours")
    total_indexed: int = Field(..., description="Total indexed documents")
    processing: int = Field(..., description="Currently processing")
    failed: int = Field(..., description="Failed documents")
    average_processing_time_ms: float = Field(..., description="Average time to index a document")


class AnalyticsQuery(BaseModel):
    """Top query information."""

    query_text: str
    count: int
    percentage: float


class QueryAnalytics(BaseModel):
    """Query analytics summary."""

    total_queries: int
    most_common: List[AnalyticsQuery]
    by_hour: Dict[str, int] = Field(default_factory=dict)
