"""
Pydantic schemas for Claims Validation API.

Request/response models for:
  POST /api/v1/claims/validate

Architecture ref:
  docs/requirements.md #FR013 – Claim Policy Validation
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ClaimType(str, Enum):
    """Insurance claim types."""
    HEALTH = "health"
    AUTO = "auto"
    HOME = "home"
    LIFE = "life"
    DISABILITY = "disability"
    PROPERTY = "property"
    LIABILITY = "liability"
    OTHER = "other"


class ApprovalStatus(str, Enum):
    """Claim validation status."""
    APPROVED = "approved"
    DENIED = "denied"
    PENDING = "pending"
    NEEDS_REVIEW = "needs_review"


class SeverityLevel(str, Enum):
    """Risk severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReferencedClause(BaseModel):
    """A policy clause referenced in the validation decision."""
    document_id: str = Field(..., description="ID of the policy document")
    chunk_index: int = Field(..., description="Index of the clause within document")
    clause_text: str = Field(..., description="Relevant clause excerpt")
    relevance_score: float = Field(..., ge=0.0, le=100.0, description="How relevant to claim (0-100)")
    violation_detected: bool = Field(default=False, description="Whether clause violation was detected")


class ClaimValidationRequest(BaseModel):
    """Request body for POST /api/v1/claims/validate."""
    claim_id: str = Field(..., description="Unique claim identifier")
    policy_id: Optional[str] = Field(default=None, description="Structured policy ID linked to documents")
    policy_number: str = Field(..., description="Associated policy number")
    claim_type: ClaimType = Field(..., description="Type of insurance claim")
    claim_amount: float = Field(..., gt=0, description="Claim amount in USD")
    description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Detailed claim description/reason"
    )
    claim_date: Optional[str] = Field(default=None, description="ISO 8601 claim date")
    workspace_id: str = Field(
        default="default",
        description="Workspace namespace for document scoping"
    )
    user_id: Optional[str] = Field(default=None, description="User submitting the claim")


class ClaimValidationResponse(BaseModel):
    """Response body from POST /api/v1/claims/validate."""
    claim_id: str
    policy_id: Optional[str] = None
    policy_number: str
    approval_status: ApprovalStatus = Field(..., description="APPROVED | DENIED | PENDING | NEEDS_REVIEW")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk assessment score (0-100)")
    severity: SeverityLevel = Field(..., description="Risk severity level")
    reasoning: str = Field(..., description="AI-generated explanation of decision")
    referenced_clauses: List[ReferencedClause] = Field(
        default_factory=list,
        description="Relevant policy clauses used in decision"
    )
    confidence_score: float = Field(..., ge=0.0, le=100.0, description="Confidence in decision (0-100)")
    next_steps: List[str] = Field(
        default_factory=list,
        description="Recommended actions (e.g., 'Manual review required', 'Approve and process')"
    )
    processed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ClaimQueueItem(BaseModel):
    claim_id: str
    policy_id: str
    policy_number: str
    claimant_name: str
    claim_type: str
    amount: float
    submission_date: str
    priority: str
    status: str
    description: Optional[str] = None


class ClaimCreateRequest(BaseModel):
    claim_id: str = Field(..., description="Unique claim identifier")
    policy_id: str = Field(..., description="Structured policy ID")
    policy_number: str = Field(..., description="Human-readable policy number")
    claimant_name: str = Field(..., description="Claimant display name")
    claim_type: ClaimType = Field(..., description="Type of insurance claim")
    amount: float = Field(..., gt=0, description="Claim amount in USD")
    submission_date: Optional[str] = Field(default=None, description="ISO 8601 submission date")
    priority: str = Field(default="medium", description="low | medium | high | urgent")
    status: str = Field(default="pending", description="pending | in_review | validated")
    description: Optional[str] = Field(default=None, description="Optional claim description")
    workspace_id: str = Field(default="default", description="Workspace namespace")


class ClaimDecisionRequest(BaseModel):
    workspace_id: str = Field(default="default", description="Workspace namespace")
    decision: str = Field(..., description="approved | approved_with_conditions | rejected | escalated")
    adjuster_notes: Optional[str] = Field(default=None, description="Adjuster notes")
    override_reason: Optional[str] = Field(default=None, description="Reason when overriding AI decision")
    user_id: Optional[str] = Field(default=None, description="User submitting the decision")
