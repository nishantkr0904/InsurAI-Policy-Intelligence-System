"""
Pydantic schemas for Compliance Review API.

Request/response models for:
  GET /api/v1/compliance/issues
  GET /api/v1/compliance/report

Architecture ref:
  docs/requirements.md #FR019 – Compliance Review
  docs/requirements.md #FR020 – Compliance Report Generation
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class RuleCategory(str, Enum):
    """Compliance rule categories."""
    DATA_PRIVACY = "data_privacy"
    SECURITY = "security"
    COVERAGE = "coverage"
    EXCLUSIONS = "exclusions"
    DISCLOSURE = "disclosure"
    CLAIMS_HANDLING = "claims_handling"
    UNDERWRITING = "underwriting"
    RETENTION = "retention"
    OTHER = "other"


class IssueStatus(str, Enum):
    """Compliance issue status."""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    WAIVED = "waived"


class SeverityLevel(str, Enum):
    """Compliance issue severity."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplianceIssue(BaseModel):
    """A single compliance issue."""
    issue_id: str = Field(..., description="Unique issue identifier")
    rule_name: str = Field(..., description="Name of compliance rule violated")
    rule_category: RuleCategory = Field(..., description="Category of rule")
    description: str = Field(..., description="Detailed issue description")
    severity: SeverityLevel = Field(..., description="Issue severity level")
    status: IssueStatus = Field(default=IssueStatus.OPEN, description="Current status")
    policy_id: Optional[str] = Field(default=None, description="Associated policy ID")
    document_section: Optional[str] = Field(default=None, description="Document section reference")
    detected_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    due_date: Optional[str] = Field(default=None, description="Deadline for remediation")
    remediation_steps: List[str] = Field(
        default_factory=list,
        description="Recommended remediation actions"
    )
    affected_records: int = Field(default=0, description="Number of affected records/clauses")


class ComplianceIssuesRequest(BaseModel):
    """Request body for GET /api/v1/compliance/issues."""
    workspace_id: str = Field(default="default", description="Workspace namespace")
    status_filter: Optional[IssueStatus] = Field(default=None, description="Filter by status")
    severity_filter: Optional[SeverityLevel] = Field(default=None, description="Filter by severity")
    category_filter: Optional[RuleCategory] = Field(default=None, description="Filter by rule category")
    limit: int = Field(default=50, ge=1, le=500, description="Maximum results to return")
    offset: int = Field(default=0, ge=0, description="Result offset for pagination")
    sort_by: str = Field(
        default="detected_date",
        description="Sort field: detected_date | severity | affected_records"
    )


class ComplianceIssuesResponse(BaseModel):
    """Response body from GET /api/v1/compliance/issues."""
    issues: List[ComplianceIssue] = Field(..., description="List of compliance issues")
    total: int = Field(..., description="Total number of issues (before pagination)")
    limit: int = Field(..., description="Limit applied")
    offset: int = Field(..., description="Offset applied")
    has_more: bool = Field(..., description="Whether there are more results")
    summary: dict = Field(
        default_factory=dict,
        description="Summary statistics: total_count, by_severity, by_status, by_category"
    )


class ComplianceReportRequest(BaseModel):
    """Request body for GET /api/v1/compliance/report."""
    workspace_id: str = Field(default="default", description="Workspace namespace")
    include_resolved: bool = Field(default=False, description="Include resolved issues")


class ExecutiveSummary(BaseModel):
    """Executive summary of compliance status."""
    compliance_score: float = Field(..., ge=0.0, le=100.0, description="Overall compliance score (0-100)")
    total_issues: int = Field(..., description="Total number of issues")
    critical_count: int = Field(..., description="Critical severity issues")
    high_count: int = Field(..., description="High severity issues")
    medium_count: int = Field(..., description="Medium severity issues")
    low_count: int = Field(..., description="Low severity issues")
    remediation_rate: float = Field(..., ge=0.0, le=100.0, description="Percentage of resolved issues")
    last_audit_date: str = Field(..., description="ISO 8601 last audit date")


class CategoryBreakdown(BaseModel):
    """Breakdown of issues by compliance category."""
    category: RuleCategory
    issue_count: int
    critical_count: int
    high_count: int
    average_days_open: float


class RiskRecommendation(BaseModel):
    """Recommendation for risk mitigation."""
    priority: int = Field(..., ge=1, description="Priority (1=highest)")
    action: str = Field(..., description="Recommended action")
    impact: str = Field(..., description="Expected impact (high/medium/low)")
    timeline: str = Field(..., description="Timeline for implementation")


class ComplianceReport(BaseModel):
    """Comprehensive compliance audit report."""
    report_id: str = Field(..., description="Unique report identifier")
    generated_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    workspace_id: str
    executive_summary: ExecutiveSummary
    category_breakdown: List[CategoryBreakdown]
    top_issues: List[ComplianceIssue]
    recommendations: List[RiskRecommendation]
    detailed_issues: List[ComplianceIssue]
