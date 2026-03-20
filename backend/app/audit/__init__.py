"""
Audit Trail module for InsurAI.

Provides audit logging, retrieval, filtering, and analytics capabilities.

Endpoints:
  - GET /api/v1/audit: Retrieve audit logs with filtering
  - GET /api/v1/audit/analytics: Generate analytics summary

Architecture ref:
  docs/requirements.md #FR021 – Audit Trail Logging
"""

from app.audit.router import router
from app.audit.schemas import (
    AuditAction,
    AuditAnalytics,
    AuditLog,
    AuditLogsRequest,
    AuditLogsResponse,
    AuditStatus,
    SeverityLevel,
)
from app.audit.service import get_audit_analytics, get_audit_logs

__all__ = [
    "router",
    "AuditAction",
    "AuditAnalytics",
    "AuditLog",
    "AuditLogsRequest",
    "AuditLogsResponse",
    "AuditStatus",
    "SeverityLevel",
    "get_audit_analytics",
    "get_audit_logs",
]
