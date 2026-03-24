"""
Pydantic schemas for the RAG chat endpoint.

Architecture ref:
  docs/system-architecture.md §3 – Backend Architecture (API contract)
  docs/roadmap.md Phase 5 – "/api/v1/chat query endpoint"
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class EdgeCaseWarning(BaseModel):
    """Warning about a potential edge case or data quality issue."""
    warning_type: str = Field(
        ...,
        description="low_confidence, conflicting_data, no_data, processing_failed",
    )
    severity: str = Field(
        ...,
        description="info, warning, error",
    )
    message: str = Field(
        ...,
        description="Human-readable warning message",
    )
    affected_documents: List[str] = Field(
        default_factory=list,
        description="Document IDs affected by this warning",
    )
    recommended_action: Optional[str] = Field(
        None,
        description="Suggested user action to resolve",
    )


class ChatRequest(BaseModel):
    """Request body for POST /api/v1/chat."""
    query: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural language question about the policy documents.",
    )
    workspace_id: str = Field(
        ...,
        description="Workspace namespace to scope the document search.",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of document chunks to retrieve before synthesis.",
    )
    model: Optional[str] = Field(
        default=None,
        description="Override LLM model. Defaults to settings.LLM_MODEL.",
    )


class SourceCitation(BaseModel):
    """A single source chunk referenced in the answer."""
    document_id: str
    chunk_index: int
    text_preview: str
    score: float


class ChatResponse(BaseModel):
    """Response body from POST /api/v1/chat."""
    answer: str
    sources: List[SourceCitation]
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score (0-1) based on retrieval quality.",
    )
    confidence_category: str = Field(
        ...,
        description="high (>0.8), medium (0.6-0.8), low (<0.6)",
    )
    model: str
    token_usage: dict
    retrieved_chunks: int
    warnings: List[EdgeCaseWarning] = Field(
        default_factory=list,
        description="Edge case warnings and data quality issues",
    )


class ChatStreamRequest(BaseModel):
    """Request body for POST /api/v1/chat/stream (SSE streaming)."""
    query: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural language question about the policy documents.",
    )
    workspace_id: str = Field(
        ...,
        description="Workspace namespace to scope the document search.",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of document chunks to retrieve before streaming.",
    )
    model: Optional[str] = Field(
        default=None,
        description="Override LLM model. Defaults to settings.LLM_MODEL.",
    )


# ---------------------------------------------------------------------------
# Retrieve endpoint schemas (Phase P5 – T8)
# ---------------------------------------------------------------------------

class RetrieveRequest(BaseModel):
    """Request body for POST /api/v1/retrieve."""
    query: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural language query to retrieve policy chunks for.",
    )
    workspace_id: str = Field(
        ...,
        description="Workspace namespace to scope the chunk search.",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of chunks to return after re-ranking.",
    )


class RankedChunk(BaseModel):
    """A single ranked chunk returned by the retrieve endpoint."""
    document_id: str
    chunk_index: int
    text: str
    dense_score: float
    bm25_score: float
    final_score: float


class RetrieveResponse(BaseModel):
    """Response body from POST /api/v1/retrieve."""
    query: str
    workspace_id: str
    chunks: List[RankedChunk]
    total: int
