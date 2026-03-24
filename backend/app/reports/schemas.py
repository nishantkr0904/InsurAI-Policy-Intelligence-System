"""
Report schemas for request/response validation.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


class ReportType(str, Enum):
    """Report type enumeration."""
    SUMMARY = "summary"
    DETAILED = "detailed"


class ExportFormat(str, Enum):
    """Export format enumeration."""
    PDF = "pdf"
    JSON = "json"
    CSV = "csv"


class RiskFactorData(BaseModel):
    """Risk factor information."""
    name: str = Field(..., description="Risk factor name")
    impact: str = Field(..., description="Impact level (low, medium, high)")
    description: str = Field(..., description="Risk factor description")


class KeyFinding(BaseModel):
    """Key finding from analysis."""
    title: str = Field(..., description="Finding title")
    description: str = Field(..., description="Detailed description")
    severity: str = Field(..., description="Severity level")
    recommendation: str = Field(..., description="Recommended action")


class PolicyInfo(BaseModel):
    """Basic policy information."""
    policy_id: str = Field(..., description="Policy identifier")
    policy_number: Optional[str] = None
    insured_name: Optional[str] = None
    policy_type: Optional[str] = None
    coverage_amount: Optional[float] = None
    deductible: Optional[float] = None


class ReportExportRequest(BaseModel):
    """Request to export a report."""
    policy_id: str = Field(..., description="Policy ID to report on")
    report_type: ReportType = Field(default=ReportType.SUMMARY, description="summary or detailed")
    export_format: ExportFormat = Field(default=ExportFormat.PDF, description="pdf, json, or csv")
    workspace_id: str = Field(..., description="Workspace identifier")
    include_analytics: bool = Field(default=False, description="Include dashboard analytics")


class ReportData(BaseModel):
    """Complete report data structure."""
    report_id: str
    policy_info: PolicyInfo
    risk_score: float = Field(..., description="0-100 risk score")
    risk_level: str = Field(..., description="Low, Medium, High, Critical")
    risk_factors: List[RiskFactorData]
    key_findings: List[KeyFinding]
    query_insights: Dict[str, Any] = Field(default_factory=dict)
    analytics_data: Optional[Dict[str, Any]] = None
    generated_at: datetime
    report_type: ReportType


class ReportExportResponse(BaseModel):
    """Response after report export."""
    report_id: str = Field(..., description="Generated report ID")
    status: str = Field(..., description="success, processing, failed")
    download_url: Optional[str] = Field(None, description="Presigned download URL")
    file_name: str = Field(..., description="Generated file name")
    file_size_bytes: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME type (application/pdf, etc.)")
    expires_at: Optional[datetime] = Field(None, description="URL expiration time")
    message: Optional[str] = None
