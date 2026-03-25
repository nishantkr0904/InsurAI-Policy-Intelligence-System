"""
Pydantic schemas for Fraud Detection API.

Request/response models for:
  GET /api/v1/fraud/alerts

Architecture ref:
  docs/requirements.md #FR016 – Fraud Pattern Detection
  docs/requirements.md #FR017 – Fraud Alert Generation
  docs/requirements.md #FR018 – Fraud Investigation Support
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class AnomalyType(str, Enum):
    """Types of fraud anomalies detected."""
    DUPLICATE_CLAIM = "duplicate_claim"
    UNUSUAL_AMOUNT = "unusual_amount"
    RAPID_CLAIMS = "rapid_claims"
    PATTERN_MISMATCH = "pattern_mismatch"
    HIGH_RISK_KEYWORDS = "high_risk_keywords"
    TEMPORAL_ANOMALY = "temporal_anomaly"
    FREQUENCY_SPIKE = "frequency_spike"
    GEOGRAPHIC_MISMATCH = "geographic_mismatch"
    POLICY_MISMATCH = "policy_mismatch"
    MULTIPLE_CLAIMS = "multiple_claims"


class AlertStatus(str, Enum):
    """Status of fraud alert."""
    NEW = "new"
    UNDER_REVIEW = "under_review"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class SeverityLevel(str, Enum):
    """Risk severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RelatedClaim(BaseModel):
    """A claim related to fraud investigation."""
    claim_id: str = Field(..., description="ID of related claim")
    similarity_score: float = Field(..., ge=0.0, le=100.0, description="Similarity to flagged claim (0-100)")
    claim_amount: float = Field(..., description="Amount of related claim")
    submit_date: str = Field(..., description="ISO 8601 submission date")


class FraudAlert(BaseModel):
    """A single fraud alert."""
    alert_id: str = Field(..., description="Unique alert identifier")
    claim_id: str = Field(..., description="Associated claim ID")
    policy_number: str = Field(..., description="Associated policy number")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Fraud risk score (0-100)")
    severity: SeverityLevel = Field(..., description="Alert severity level")
    anomaly_types: List[AnomalyType] = Field(
        default_factory=list,
        description="Types of anomalies detected"
    )
    status: AlertStatus = Field(default=AlertStatus.NEW, description="Alert status")
    reasoning: str = Field(..., description="AI-generated explanation of fraud risk")
    claim_amount: float = Field(..., description="Amount of flagged claim")
    submit_date: str = Field(..., description="ISO 8601 claim submission date")
    detected_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    related_claims: List[RelatedClaim] = Field(
        default_factory=list,
        description="Claims with similar patterns"
    )
    confidence_score: float = Field(..., ge=0.0, le=100.0, description="Confidence in fraud assessment (0-100)")


class FraudAlertsRequest(BaseModel):
    """Request body for GET /api/v1/fraud/alerts."""
    workspace_id: str = Field(default="default", description="Workspace namespace")
    status_filter: Optional[AlertStatus] = Field(default=None, description="Filter by alert status")
    severity_filter: Optional[SeverityLevel] = Field(default=None, description="Filter by severity")
    min_risk_score: float = Field(default=0.0, ge=0.0, le=100.0, description="Minimum risk score filter")
    limit: int = Field(default=50, ge=1, le=500, description="Maximum results to return")
    offset: int = Field(default=0, ge=0, description="Result offset for pagination")
    sort_by: str = Field(
        default="detected_date",
        description="Sort field: detected_date | risk_score | claim_amount"
    )


class FraudAlertsResponse(BaseModel):
    """Response body from GET /api/v1/fraud/alerts."""
    alerts: List[FraudAlert] = Field(..., description="List of fraud alerts")
    total: int = Field(..., description="Total number of alerts (before pagination)")
    limit: int = Field(..., description="Limit applied")
    offset: int = Field(..., description="Offset applied")
    has_more: bool = Field(..., description="Whether there are more results")


class FraudInvestigationPanel(BaseModel):
    """Detailed investigation data for a fraud alert."""
    alert_id: str
    claim_id: str
    status: AlertStatus
    risk_score: float
    severity: SeverityLevel
    anomaly_types: List[AnomalyType]
    reasoning: str
    confidence_score: float
    related_claims: List[RelatedClaim]
    investigation_notes: str = Field(default="")


class FraudAlertStatusUpdate(BaseModel):
    """Request body for PATCH /api/v1/fraud/alerts/{alert_id}/status."""
    status: AlertStatus = Field(..., description="New alert status")
    notes: Optional[str] = Field(default=None, description="Investigation notes")
    workspace_id: str = Field(default="default", description="Workspace namespace")


class FraudAlertStatusResponse(BaseModel):
    """Response body from PATCH /api/v1/fraud/alerts/{alert_id}/status."""
    alert_id: str
    status: AlertStatus
    previous_status: AlertStatus
    updated_at: str
    message: str
