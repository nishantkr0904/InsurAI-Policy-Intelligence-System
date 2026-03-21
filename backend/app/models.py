"""
SQLAlchemy ORM models for InsurAI.

Models:
  - BaseMixin: Mixin with common fields (id, workspace_id, created_at, updated_at, etc.)
  - Document: Document metadata from file uploads
  - AuditLog: Audit trail logging all system actions
  - FraudAlert: Fraud detection analysis results
  - ComplianceIssue: Compliance violation tracking
  - ClaimValidation: Claim validation decisions
  - Chunk: Document chunks (optional, for future Milvus metadata)
  - ErrorLog: System error tracking for monitoring (FR029)
  - PerformanceMetric: Performance metrics for API and AI operations (FR030)

All models include workspace_id for strict multi-tenant isolation.

Architecture ref:
  docs/system-architecture.md §3 – Data Model
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    Float,
    DateTime,
    Text,
    Boolean,
    JSON,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _generate_id() -> str:
    """Generate a UUID string for primary keys."""
    return str(uuid.uuid4())


# ============================================================================
# BASE MIXIN
# ============================================================================

class BaseMixin:
    """
    Mixin providing common fields for all models.

    Every InsurAI entity includes:
      - id: Unique identifier (UUID string)
      - workspace_id: Workspace namespace for multi-tenancy
      - created_at: Record creation timestamp
      - updated_at: Last update timestamp
      - created_by: User ID who created the record
      - updated_by: User ID who last updated the record
      - deleted_at: Soft delete marker (NULL = active, not NULL = deleted)

    These fields enable:
      - Audit trails (who did what, when)
      - Multi-tenant data isolation (workspace_id filter)
      - Soft deletes (data recovery)
    """

    id = Column(String(36), primary_key=True, default=_generate_id)
    workspace_id = Column(String(64), nullable=False, index=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        index=True,
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )

    created_by = Column(String(64), nullable=True)  # User ID
    updated_by = Column(String(64), nullable=True)  # User ID

    deleted_at = Column(DateTime, nullable=True, index=True)  # Soft delete marker


# ============================================================================
# WORKSPACE MODEL
# ============================================================================

class Workspace(Base):
    """
    Workspace (tenant) table.

    Central entity for multi-tenant data isolation.
    Each workspace represents an independent insurance organization with:
      - Unique identity (slug, name, organization)
      - Owner and members (user access control)
      - Settings and preferences (configuration)
      - Resource limits (quotas, storage limits)

    All other models reference workspace_id to enforce data isolation.

    Architecture ref:
      docs/system-architecture.md §11 – Multi-Tenant Architecture
    """

    __tablename__ = "workspaces"

    # Primary key (NOT using BaseMixin because Workspace is the root entity)
    id = Column(String(36), primary_key=True, default=_generate_id)

    # Identity
    slug = Column(String(64), nullable=False, unique=True, index=True)
    # URL-safe identifier: "acme-insurance", "global-underwriters"

    name = Column(String(255), nullable=False)
    # Display name: "ACME Insurance Co."

    organization = Column(String(255), nullable=True)
    # Legal entity name

    # Ownership
    owner_id = Column(String(64), nullable=False, index=True)
    # User ID of workspace owner (for billing, admin rights)

    # Members (JSON array of user IDs with roles)
    members = Column(JSON, nullable=False, default=list)
    # Example:
    # [
    #   {"user_id": "user_123", "role": "admin", "joined_at": "2026-03-20"},
    #   {"user_id": "user_456", "role": "member", "joined_at": "2026-03-21"}
    # ]

    # Settings
    settings = Column(JSON, nullable=False, default=dict)
    # Example:
    # {
    #   "default_retention_days": 90,
    #   "allow_public_sharing": false,
    #   "require_mfa": true,
    #   "timezone": "America/New_York"
    # }

    # Resource limits
    max_documents = Column(Integer, nullable=True, default=10000)
    max_storage_bytes = Column(BigInteger, nullable=True, default=10737418240)  # 10 GB
    max_users = Column(Integer, nullable=True, default=50)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    # false = suspended/disabled workspace

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        index=True,
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
    )
    deleted_at = Column(DateTime, nullable=True, index=True)  # Soft delete

    # Indexes
    __table_args__ = (
        Index("idx_workspace_owner", "owner_id"),
        Index("idx_workspace_active", "is_active", "deleted_at"),
    )


# ============================================================================
# DOCUMENT MODEL
# ============================================================================

class Document(Base, BaseMixin):
    """
    Document metadata table.

    Tracks all uploaded policy documents with ingestion status.
    Links documents to:
      - MinIO: where the raw file is stored (object_key)
      - Milvus: document chunks and embeddings (via Chunk model, future)
      - Celery: async ingestion pipeline status

    Lifecycle:
      1. User uploads file → Document created with status="pending"
      2. Celery task picks up job
      3. Task parses, chunks, embeds document
      4. Status updated to "indexed" with chunk_count
      5. If error, status="failed" with error_message
    """

    __tablename__ = "documents"

    # File information
    filename = Column(String(255), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    content_type = Column(String(50), nullable=False)  # e.g., "application/pdf"

    # Storage reference
    object_key = Column(String(512), nullable=False)  # MinIO path

    # Ingestion status
    status = Column(String(20), nullable=False, default="pending", index=True)
    # Values: pending, processing, indexed, failed

    # Metadata
    uploaded_by = Column(String(64), nullable=True)  # User ID
    processed_at = Column(DateTime, nullable=True)  # When ingestion completed (status=indexed)
    chunk_count = Column(Integer, nullable=True)  # Number of chunks created
    error_message = Column(Text, nullable=True)  # If status=failed

    # Relationships
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_doc_workspace_status", "workspace_id", "status"),
        Index("idx_doc_workspace_created", "workspace_id", "created_at"),
        UniqueConstraint("workspace_id", "object_key", name="uq_doc_workspace_object_key"),
    )


# ============================================================================
# AUDIT LOG MODEL
# ============================================================================

class AuditLog(Base, BaseMixin):
    """
    Audit trail table.

    Records all system actions for compliance, debugging, and security monitoring.

    Captures:
      - What action was performed (document_upload, chat_query, claim_validate, etc.)
      - Who performed it (user_id, user_email)
      - When it happened (created_at timestamp)
      - Result status (success, failure, partial, error)
      - Severity level (info, warning, error, critical)
      - Resource affected (document_id, claim_id, etc.)
      - Metadata: IP address, user agent, duration, context, error messages

    Replaces: app/audit/service.py _generate_sample_audit_logs()
    Future replacement for: In-memory MVP sample data generation
    """

    __tablename__ = "audit_logs"

    # Action details
    user_id = Column(String(64), nullable=False, index=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(50), nullable=False, index=True)
    # Values: document_upload, chat_query, claim_validate, fraud_alert_view,
    #         compliance_scan, user_login, policy_create, etc.

    status = Column(String(20), nullable=False, default="success", index=True)
    # Values: success, failure, partial, error

    severity = Column(String(20), nullable=False, default="info", index=True)
    # Values: info, warning, error, critical

    resource_type = Column(String(50), nullable=True)  # e.g., "document", "claim", "fraud"
    resource_id = Column(String(64), nullable=True, index=True)

    description = Column(Text, nullable=False)  # Human-readable description

    # Flexible metadata as JSON (renamed from metadata to avoid SQLAlchemy conflict)
    meta_data = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "ip_address": "192.168.1.10",
    #   "user_agent": "InsurAI-Client/1.0",
    #   "duration_ms": 245,
    #   "document_id": "doc_...",
    #   "query_text": "What is the deductible?",
    #   "error_message": "Permission denied"
    # }

    # Indexes
    __table_args__ = (
        Index("idx_audit_workspace_timestamp", "workspace_id", "created_at"),
        Index("idx_audit_workspace_user_action", "workspace_id", "user_id", "action"),
        Index("idx_audit_severity_status", "severity", "status"),
    )


# ============================================================================
# FRAUD ALERT MODEL
# ============================================================================

class FraudAlert(Base, BaseMixin):
    """
    Fraud detection alerts table.

    Stores results of fraud pattern detection analysis on claims.

    Contains:
      - Alert details (alert_number, claim_id, policy_number)
      - Risk assessment (risk_score 0-100, severity level)
      - Detection analysis (anomaly_types, reasoning, confidence_score)
      - Alert management (status, investigation history, notes)
      - Related claims (similar patterns for investigation)

    Replaces: app/fraud/service.py _generate_sample_fraud_alerts()
    """

    __tablename__ = "fraud_alerts"

    # Alert identification
    alert_number = Column(String(50), nullable=False, index=True, unique=True)
    # Format: "ALERT-2026-001234" for readability

    # Related entity
    claim_id = Column(String(64), nullable=False, index=True)
    policy_number = Column(String(50), nullable=True)

    # Risk assessment
    risk_score = Column(Float, nullable=False, default=0.0)  # 0-100
    severity = Column(String(20), nullable=False, default="low", index=True)
    # Values: low, medium, high, critical

    # Detection details
    anomaly_types = Column(JSON, nullable=False, default=list)
    # Example: ["duplicate_claim", "unusual_amount", "rapid_claims"]

    reasoning = Column(Text, nullable=True)  # LLM-generated explanation
    confidence_score = Column(Float, nullable=False, default=0.0)  # 0-100
    recommended_action = Column(String(50), nullable=True)
    # Values: approve, escalate, investigate

    # Alert management
    status = Column(String(20), nullable=False, default="pending", index=True)
    # Values: pending, investigating, closed, escalated

    investigated_by = Column(String(64), nullable=True)  # User ID
    investigation_notes = Column(Text, nullable=True)
    investigation_date = Column(DateTime, nullable=True)

    # Related claims for investigation
    related_claims = Column(JSON, nullable=True, default=list)
    # Example: [{"claim_id": "...", "amount": 1000, "date": "2026-03-15"}]

    # Indexes
    __table_args__ = (
        Index("idx_fraud_workspace_status", "workspace_id", "status"),
        Index("idx_fraud_workspace_severity", "workspace_id", "severity"),
        Index("idx_fraud_claim_id", "claim_id"),
        Index("idx_fraud_workspace_created", "workspace_id", "created_at"),
    )


# ============================================================================
# COMPLIANCE ISSUE MODEL
# ============================================================================

class ComplianceIssue(Base, BaseMixin):
    """
    Compliance violation tracking table.

    Records regulatory compliance violations detected in policies and documents.

    Contains:
      - Issue details (issue_number, document_id, policy_number)
      - Classification (rule_category, severity, status)
      - Violation details (title, description, violation_text)
      - Remediation (required actions, deadline, status)
      - Impact (affected policies, affected_count)

    Replaces: app/compliance/service.py _generate_sample_compliance_issues()
    """

    __tablename__ = "compliance_issues"

    # Issue identification
    issue_number = Column(String(50), nullable=False, index=True, unique=True)
    # Format: "COMP-2026-001234" for readability

    # Related entities
    document_id = Column(String(64), ForeignKey("documents.id"), nullable=True)
    policy_number = Column(String(50), nullable=True)

    # Classification
    rule_category = Column(String(50), nullable=False, index=True)
    # Values: data_privacy, security, coverage, exclusions, disclosure,
    #         claims_handling, underwriting, retention, other

    severity = Column(String(20), nullable=False, default="medium", index=True)
    # Values: low, medium, high, critical

    status = Column(String(20), nullable=False, default="open", index=True)
    # Values: open, in_progress, resolved, waived

    # Details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    violation_text = Column(Text, nullable=True)  # Actual problematic text from policy

    # Remediation
    required_remediation = Column(Text, nullable=False)
    remediation_notes = Column(Text, nullable=True)
    remediation_deadline = Column(DateTime, nullable=True)
    remediated_at = Column(DateTime, nullable=True)

    # Impact assessment
    impact_level = Column(String(20), nullable=False, default="medium")
    # Values: low, medium, high, critical

    affected_policies = Column(JSON, nullable=True, default=list)
    # Example: ["POL-001", "POL-002"]

    # Indexes
    __table_args__ = (
        Index("idx_comp_workspace_status", "workspace_id", "status"),
        Index("idx_comp_workspace_category", "workspace_id", "rule_category"),
        Index("idx_comp_severity_status", "severity", "status"),
        Index("idx_comp_workspace_created", "workspace_id", "created_at"),
    )


# ============================================================================
# CLAIM VALIDATION MODEL
# ============================================================================

class ClaimValidation(Base, BaseMixin):
    """
    Claim validation decision records table.

    Tracks all claim validation requests and decisions.

    Contains:
      - Claim details (claim_id, policy_number, claim_type, amount, description)
      - Submission information (submitted_by, submitted_at)
      - Decision (approval_status, risk_score, severity)
      - Analysis (reasoning, confidence_score, referenced_clauses)
      - Follow-up (next_steps, approval_notes)

    Replaces: app/claims/service.py (which currently doesn't store results)
    """

    __tablename__ = "claim_validations"

    # Claim identification
    claim_id = Column(String(64), nullable=False, index=True, unique=True)
    policy_number = Column(String(50), nullable=False, index=True)
    claim_type = Column(String(50), nullable=False)
    # Values: health, auto, home, life, general, disability, property, liability

    # Claim details
    claim_amount = Column(Float, nullable=False)
    claim_date = Column(DateTime, nullable=True, index=True)
    description = Column(Text, nullable=False)

    # Submission
    submitted_by = Column(String(64), nullable=True)  # User ID
    submitted_at = Column(DateTime, nullable=True)

    # Decision
    approval_status = Column(String(20), nullable=False, index=True)
    # Values: approved, denied, pending, needs_review

    risk_score = Column(Float, nullable=False, default=0.0)  # 0-100
    severity = Column(String(20), nullable=False, default="low")
    # Values: low, medium, high, critical

    # Analysis
    reasoning = Column(Text, nullable=False)  # LLM-generated explanation
    confidence_score = Column(Float, nullable=False, default=0.0)  # 0-100

    # Referenced policy clauses (JSON for flexibility)
    referenced_clauses = Column(JSON, nullable=False, default=list)
    # Example:
    # [
    #   {
    #     "clause_id": "...",
    #     "section": "Coverage Limits",
    #     "text": "...",
    #     "relevance_score": 0.95
    #   }
    # ]

    # Next steps
    next_steps = Column(JSON, nullable=False, default=list)
    # Example: ["escalate_to_manager", "request_medical_records"]

    # Approval details (when approved/denied)
    approved_by = Column(String(64), nullable=True)  # User ID
    approved_at = Column(DateTime, nullable=True)
    approval_notes = Column(Text, nullable=True)

    # Indexes
    __table_args__ = (
        Index("idx_claim_workspace_status", "workspace_id", "approval_status"),
        Index("idx_claim_policy", "policy_number"),
        Index("idx_claim_workspace_created", "workspace_id", "created_at"),
        Index("idx_claim_date", "claim_date"),
    )


# ============================================================================
# DOCUMENT CHUNK MODEL
# ============================================================================

class Chunk(Base, BaseMixin):
    """
    Document chunk metadata table (optional, for future Milvus integration).

    Currently, chunks are stored only in Milvus, but this model provides
    database-backed metadata when needed for:
      - Tracking embedding status per chunk
      - Linking chunks to source documents
      - Querying chunk metadata without hitting Milvus
      - Future audit trails for embeddings

    This table can be added in Phase 3+ when needed.
    """

    __tablename__ = "chunks"

    # References
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)

    # Content
    text = Column(Text, nullable=False)

    # Embedding tracking
    embedding_id = Column(String(64), nullable=True)  # Milvus internal ID

    # Relationship
    document = relationship("Document", back_populates="chunks")

    # Indexes
    __table_args__ = (
        Index("idx_chunk_document_index", "document_id", "chunk_index"),
    )


# ============================================================================
# ERROR LOG MODEL (FR029)
# ============================================================================

class ErrorLog(Base):
    """
    System error tracking table (FR029).

    Records all errors from:
      - API endpoints (HTTP 5xx errors)
      - Celery tasks (ingestion, indexing failures)
      - Background jobs (embedding, vector store operations)
      - External service failures (MinIO, Milvus, LLM APIs)

    Contains:
      - Error identification (error_id, error_code, error_type)
      - Context (source, operation, workspace_id, user_id)
      - Details (message, stack_trace, request_data)
      - Resolution (status, resolved_at, resolution_notes)

    Architecture ref:
      docs/requirements.md #FR029 – Error Monitoring
    """

    __tablename__ = "error_logs"

    # Primary key
    id = Column(String(36), primary_key=True, default=_generate_id)

    # Error identification
    error_code = Column(String(50), nullable=True, index=True)
    # Format: "INGESTION_FAILED", "EMBEDDING_ERROR", "API_ERROR", etc.

    error_type = Column(String(100), nullable=False, index=True)
    # Python exception type: "ValueError", "ConnectionError", "TimeoutError"

    # Context
    source = Column(String(50), nullable=False, index=True)
    # Values: "api", "celery", "ingestion", "embedding", "indexing", "llm", "minio", "milvus"

    operation = Column(String(100), nullable=False)
    # Operation that failed: "ingest_document", "generate_embeddings", "POST /api/v1/chat"

    workspace_id = Column(String(64), nullable=True, index=True)
    # May be null for system-level errors

    user_id = Column(String(64), nullable=True, index=True)
    # User who triggered the operation (if applicable)

    # Error details
    message = Column(Text, nullable=False)
    # Human-readable error message

    stack_trace = Column(Text, nullable=True)
    # Full Python traceback for debugging

    # Request context (for API errors)
    request_data = Column(JSON, nullable=True)
    # Example:
    # {
    #   "method": "POST",
    #   "path": "/api/v1/chat",
    #   "query_params": {},
    #   "headers": {"X-User-ID": "..."},
    #   "body_preview": "..."
    # }

    # Task context (for Celery errors)
    task_data = Column(JSON, nullable=True)
    # Example:
    # {
    #   "task_id": "abc123",
    #   "task_name": "insurai.ingest_document",
    #   "args": ["doc_id", "object_key"],
    #   "retries": 2
    # }

    # Severity
    severity = Column(String(20), nullable=False, default="error", index=True)
    # Values: warning, error, critical

    # Resolution tracking
    status = Column(String(20), nullable=False, default="new", index=True)
    # Values: new, acknowledged, investigating, resolved, ignored

    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(64), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        index=True,
    )

    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_error_source_type", "source", "error_type"),
        Index("idx_error_workspace_created", "workspace_id", "created_at"),
        Index("idx_error_severity_status", "severity", "status"),
        Index("idx_error_created", "created_at"),
    )


# ============================================================================
# PERFORMANCE METRIC MODEL (FR030)
# ============================================================================

class PerformanceMetric(Base):
    """
    Performance metrics tracking table (FR030).

    Records timing and performance data from:
      - API requests (HTTP endpoint latency)
      - RAG operations (retrieval, reranking, synthesis)
      - LLM operations (inference time, token usage)
      - Embedding operations (generation time, batch size)
      - Vector search (query time, result count)
      - Database operations (query duration)

    Contains:
      - Operation context (operation, endpoint, source)
      - Timing metrics (duration_ms, breakdown by phase)
      - Resource metrics (tokens used, items processed)
      - Result metadata (result_count, quality scores)
      - Workspace and user context for multi-tenancy

    Architecture ref:
      docs/requirements.md #FR030 – Performance Monitoring
    """

    __tablename__ = "performance_metrics"

    # Primary key
    id = Column(String(36), primary_key=True, default=_generate_id)

    # Workspace isolation
    workspace_id = Column(String(64), nullable=True, index=True)

    # User context
    user_id = Column(String(64), nullable=True, index=True)

    # Operation context
    operation = Column(String(100), nullable=False, index=True)
    # Values: "rag_chat", "retrieval_query", "embeddings", "vector_search",
    #         "llm_synthesis", "document_ingest", "api_request", etc.

    endpoint = Column(String(128), nullable=True, index=True)
    # HTTP endpoint for API requests: "POST /api/v1/chat"

    source = Column(String(50), nullable=False, index=True)
    # Values: "api", "rag", "celery", "embedding", "milvus", "llm"

    # Total duration
    duration_ms = Column(Float, nullable=False, index=True)
    # Total time in milliseconds for the operation

    # Phased breakdown (for composite operations like RAG)
    # Example: {"retrieval": 120, "reranking": 45, "synthesis": 1200}
    phase_durations = Column(JSON, nullable=True)

    # Result metrics
    result_count = Column(Integer, nullable=True)
    # Number of items returned (e.g., documents retrieved, chunks ranked)

    # AI/LLM metrics
    tokens_used = Column(Integer, nullable=True)
    # Total tokens used in LLM operation

    tokens_input = Column(Integer, nullable=True)
    # Input tokens for LLM

    tokens_output = Column(Integer, nullable=True)
    # Output tokens for LLM

    model_name = Column(String(100), nullable=True)
    # Model used: "gpt-4", "claude-opus", "text-embedding-3-small", etc.

    # Embedding metrics
    batch_size = Column(Integer, nullable=True)
    # Number of items embedded in batch

    embedding_dim = Column(Integer, nullable=True)
    # Dimension of embedding vector

    # Vector search metrics
    query_time_ms = Column(Float, nullable=True)
    # Time spent in vector database query

    rerank_score = Column(Float, nullable=True)
    # Reranking score (0-1) for top result

    # Status and quality
    status = Column(String(20), nullable=False, default="success", index=True)
    # Values: success, partial, error

    quality_score = Column(Float, nullable=True)
    # Quality indicator (0-1) for the operation result

    # Additional context
    metric_data = Column(JSON, nullable=True)
    # Flexible field for operation-specific metrics
    # Example:
    # {
    #   "retrieval_method": "hybrid",
    #   "milvus_results": 50,
    #   "bm25_results": 20,
    #   "final_ranked": 5,
    #   "cache_hit": false,
    #   "retry_count": 0
    # }

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        index=True,
    )

    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_perf_workspace_operation", "workspace_id", "operation"),
        Index("idx_perf_operation_created", "operation", "created_at"),
        Index("idx_perf_duration", "duration_ms"),
        Index("idx_perf_endpoint_created", "endpoint", "created_at"),
        Index("idx_perf_workspace_created", "workspace_id", "created_at"),
    )
