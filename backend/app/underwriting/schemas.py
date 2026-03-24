"""Pydantic schemas for Underwriting API."""

from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class PolicyType(str, Enum):
    """Insurance policy types."""
    HOME = "home"
    AUTO = "auto"
    LIFE = "life"
    COMMERCIAL = "commercial"
    HEALTH = "health"
    DISABILITY = "disability"


class RiskLevel(str, Enum):
    """Risk classification levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class LocationRiskTier(str, Enum):
    """Location-based risk tier."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RiskAssessmentRequest(BaseModel):
    """Request for policy risk assessment."""
    policy_id: str = Field(..., description="Unique policy identifier")
    policy_type: PolicyType = Field(..., description="Type of insurance policy")
    coverage_amount: float = Field(..., gt=0, description="Total coverage amount in USD")
    deductible: float = Field(..., ge=0, description="Deductible amount in USD")
    insured_value: float = Field(..., gt=0, description="Value of insured property/person")
    location_risk_tier: LocationRiskTier = Field(..., description="Risk tier of location")
    claim_history: int = Field(..., ge=0, description="Number of claims in past 5 years")
    workspace_id: str = Field(default="default", description="Workspace for document scoping")


class RiskFactor(BaseModel):
    """Individual risk factor identified in assessment."""
    factor: str = Field(..., description="Description of risk factor")
    impact: str = Field(..., description="Impact level: low, medium, high")
    source: Optional[str] = Field(None, description="Policy clause or source of this factor")


class RiskAssessmentResponse(BaseModel):
    """Response from policy risk assessment."""
    risk_score: float = Field(..., ge=0, le=100, description="Risk score 0-100")
    risk_level: RiskLevel = Field(..., description="Classification: low/medium/high/critical")
    underwriting_recommendation: str = Field(..., description="Recommendation for underwriter")
    key_risk_factors: List[str] = Field(..., description="List of identified risk factors")
    mitigation_strategies: List[str] = Field(..., description="Suggested mitigation approaches")
    premium_adjustment: float = Field(..., description="Recommended premium adjustment percentage")
    next_review_date: str = Field(..., description="ISO 8601 date for next policy review")


class OverrideRecord(BaseModel):
    """Record of an underwriter override decision."""
    policy_id: str
    original_risk_score: float
    original_risk_level: str
    override_decision: str = Field(..., description="Decision: approve or reject")
    justification: str = Field(..., description="Underwriter justification")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
