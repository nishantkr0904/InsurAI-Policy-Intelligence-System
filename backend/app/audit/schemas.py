"""
Pydantic schemas for Audit Trail API.

Request/response models for:
  GET /api/v1/audit
  GET /api/v1/audit/analytics

Architecture ref:
  docs/requirements.md #FR021 – Audit Trail Logging
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class AuditAction(str, Enum):
    """Types of auditable actions."""
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_DELETE = "document_delete"
    DOCUMENT_VIEW = "document_view"
    CHAT_QUERY = "chat_query"
    RETRIEVAL_QUERY = "retrieval_query"
    CLAIM_VALIDATE = "claim_validate"
    FRAUD_ALERT_VIEW = "fraud_alert_view"
    FRAUD_ALERT_UPDATE = "fraud_alert_update"
    COMPLIANCE_SCAN = "compliance_scan"
    COMPLIANCE_REPORT = "compliance_report"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    POLICY_CREATE = "policy_create"
    POLICY_UPDATE = "policy_update"
    POLICY_DELETE = "policy_delete"
    WORKSPACE_ACCESS = "workspace_access"
    SETTINGS_CHANGE = "settings_change"
    API_ACCESS = "api_access"


class AuditStatus(str, Enum):
    """Status of audit event."""
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    ERROR = "error"


class SeverityLevel(str, Enum):
    """Audit event severity."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditMetadata(BaseModel):
    """Additional metadata for audit event."""
    document_id: Optional[str] = Field(default=None, description="Document ID if relevant")
    claim_id: Optional[str] = Field(default=None, description="Claim ID if relevant")
    alert_id: Optional[str] = Field(default=None, description="Alert ID if relevant")
    query_text: Optional[str] = Field(default=None, description="Query text for chat/retrieval")
    ip_address: Optional[str] = Field(default=None, description="Client IP address")
    user_agent: Optional[str] = Field(default=None, description="Client user agent")
    duration_ms: Optional[int] = Field(default=None, description="Operation duration in milliseconds")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    additional_context: dict = Field(default_factory=dict, description="Additional contextual data")


class AuditLog(BaseModel):
    """A single audit log entry."""
    audit_id: str = Field(..., description="Unique audit entry identifier")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    workspace_id: str = Field(..., description="Workspace namespace")
    user_id: str = Field(..., description="User who performed the action")
    user_email: Optional[str] = Field(default=None, description="User email address")
    action: AuditAction = Field(..., description="Action performed")
    status: AuditStatus = Field(..., description="Status of the action")
    severity: SeverityLevel = Field(default=SeverityLevel.INFO, description="Severity level")
    resource_type: Optional[str] = Field(default=None, description="Type of resource affected")
    resource_id: Optional[str] = Field(default=None, description="ID of affected resource")
    description: str = Field(..., description="Human-readable description of action")
    metadata: AuditMetadata = Field(default_factory=AuditMetadata, description="Additional metadata")


class AuditLogsRequest(BaseModel):
    """Request body for GET /api/v1/audit."""
    workspace_id: str = Field(default="default", description="Workspace namespace")
    user_id_filter: Optional[str] = Field(default=None, description="Filter by user ID")
    action_filter: Optional[AuditAction] = Field(default=None, description="Filter by action type")
    status_filter: Optional[AuditStatus] = Field(default=None, description="Filter by status")
    severity_filter: Optional[SeverityLevel] = Field(default=None, description="Filter by severity")
    start_date: Optional[str] = Field(default=None, description="Filter start date (ISO 8601)")
    end_date: Optional[str] = Field(default=None, description="Filter end date (ISO 8601)")
    limit: int = Field(default=50, ge=1, le=500, description="Maximum results to return")
    offset: int = Field(default=0, ge=0, description="Result offset for pagination")
    sort_by: str = Field(
        default="timestamp",
        description="Sort field: timestamp | action | status"
    )


class AuditLogsResponse(BaseModel):
    """Response body from GET /api/v1/audit."""
    logs: List[AuditLog] = Field(..., description="List of audit log entries")
    total: int = Field(..., description="Total number of logs (before pagination)")
    limit: int = Field(..., description="Limit applied")
    offset: int = Field(..., description="Offset applied")
    has_more: bool = Field(..., description="Whether there are more results")
    summary: dict = Field(
        default_factory=dict,
        description="Summary statistics: total_count, by_action, by_status, by_user"
    )


class TopAction(BaseModel):
    """Top action in audit analytics."""
    action: AuditAction
    count: int
    success_rate: float = Field(..., ge=0.0, le=100.0, description="Success rate percentage")
    avg_duration_ms: Optional[float] = Field(default=None, description="Average duration in ms")


class ActiveUser(BaseModel):
    """Active user in audit analytics."""
    user_id: str
    user_email: Optional[str]
    action_count: int
    last_activity: str = Field(..., description="ISO 8601 timestamp of last activity")


class AuditAnalyticsRequest(BaseModel):
    """Request body for GET /api/v1/audit/analytics."""
    workspace_id: str = Field(default="default", description="Workspace namespace")
    start_date: Optional[str] = Field(default=None, description="Analysis start date (ISO 8601)")
    end_date: Optional[str] = Field(default=None, description="Analysis end date (ISO 8601)")
    top_n: int = Field(default=10, ge=1, le=50, description="Number of top items to return")


class AuditAnalytics(BaseModel):
    """Analytics summary of audit trail."""
    workspace_id: str
    total_events: int
    success_rate: float = Field(..., ge=0.0, le=100.0, description="Overall success rate")
    top_actions: List[TopAction] = Field(..., description="Most frequent actions")
    most_active_users: List[ActiveUser] = Field(..., description="Most active users")
    error_count: int = Field(..., description="Total error events")
    critical_count: int = Field(..., description="Total critical severity events")
    avg_response_time_ms: Optional[float] = Field(default=None, description="Average response time")
    period_start: str = Field(..., description="ISO 8601 analysis period start")
    period_end: str = Field(..., description="ISO 8601 analysis period end")
