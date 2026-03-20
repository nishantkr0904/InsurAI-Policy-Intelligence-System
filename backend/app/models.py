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

    # Flexible metadata as JSON
    metadata = Column(JSON, nullable=True)
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
