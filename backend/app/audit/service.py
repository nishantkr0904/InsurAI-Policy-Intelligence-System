"""
Audit Trail Service.

Implements audit logging, retrieval, filtering, and analytics.

Pipeline:
  1. Retrieve audit logs from workspace (MVP: sample data)
  2. Apply filters: user_id, action, status, severity, date range
  3. Compute summary statistics
  4. Return paginated results with analytics

Architecture ref:
  docs/requirements.md #FR021 – Audit Trail Logging
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

import logging
import random
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import List, Dict

from app.audit.schemas import (
    AuditAction,
    AuditAnalytics,
    AuditAnalyticsRequest,
    AuditLog,
    AuditLogsRequest,
    AuditLogsResponse,
    AuditMetadata,
    AuditStatus,
    ActiveUser,
    SeverityLevel,
    TopAction,
)

logger = logging.getLogger(__name__)


def _generate_sample_audit_logs(
    workspace_id: str,
    limit: int = 100,
) -> List[AuditLog]:
    """
    Generate sample audit logs for MVP (until real audit database exists).

    This function creates realistic-looking audit entries spanning various
    actions and statuses.
    """
    logs = []

    # Sample users
    users = [
        ("user_001", "alice@insuranceio.com"),
        ("user_002", "bob@insuranceio.com"),
        ("user_003", "carol@insuranceio.com"),
        ("user_004", "dave@insuranceio.com"),
        ("user_005", "eve@insuranceio.com"),
    ]

    # Sample IP addresses
    ips = ["192.168.1.10", "192.168.1.20", "10.0.0.5", "172.16.0.30", "192.168.2.15"]

    # Action descriptions
    action_descriptions = {
        AuditAction.DOCUMENT_UPLOAD: "Uploaded policy document",
        AuditAction.DOCUMENT_DELETE: "Deleted policy document",
        AuditAction.DOCUMENT_VIEW: "Viewed policy document",
        AuditAction.CHAT_QUERY: "Submitted chat query to RAG system",
        AuditAction.RETRIEVAL_QUERY: "Executed document retrieval query",
        AuditAction.CLAIM_VALIDATE: "Validated claim against policy",
        AuditAction.FRAUD_ALERT_VIEW: "Viewed fraud alert details",
        AuditAction.FRAUD_ALERT_UPDATE: "Updated fraud alert status",
        AuditAction.COMPLIANCE_SCAN: "Ran compliance scan on documents",
        AuditAction.COMPLIANCE_REPORT: "Generated compliance report",
        AuditAction.USER_LOGIN: "User logged in to system",
        AuditAction.USER_LOGOUT: "User logged out of system",
        AuditAction.POLICY_CREATE: "Created new insurance policy",
        AuditAction.POLICY_UPDATE: "Updated insurance policy details",
        AuditAction.POLICY_DELETE: "Deleted insurance policy",
        AuditAction.WORKSPACE_ACCESS: "Accessed workspace",
        AuditAction.SETTINGS_CHANGE: "Changed system settings",
        AuditAction.API_ACCESS: "Accessed API endpoint",
    }

    # Generate logs for the past 30 days
    now = datetime.utcnow()

    for i in range(limit):
        user_id, user_email = random.choice(users)
        action = random.choice(list(AuditAction))

        # Weight toward success
        status = random.choices(
            [AuditStatus.SUCCESS, AuditStatus.FAILURE, AuditStatus.PARTIAL, AuditStatus.ERROR],
            weights=[85, 5, 5, 5],
        )[0]

        # Severity based on status
        if status == AuditStatus.ERROR:
            severity = random.choice([SeverityLevel.ERROR, SeverityLevel.CRITICAL])
        elif status == AuditStatus.FAILURE:
            severity = random.choice([SeverityLevel.WARNING, SeverityLevel.ERROR])
        else:
            severity = SeverityLevel.INFO

        # Timestamp (past 30 days)
        days_ago = random.randint(0, 29)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        timestamp = now - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)

        # Build metadata
        metadata = AuditMetadata(
            ip_address=random.choice(ips),
            user_agent=f"InsurAI-Client/{random.choice(['1.0', '1.1', '1.2'])}",
            duration_ms=random.randint(50, 5000) if status == AuditStatus.SUCCESS else random.randint(100, 10000),
        )

        # Add context based on action
        if action == AuditAction.DOCUMENT_UPLOAD:
            metadata.document_id = f"doc_{uuid.uuid4().hex[:12]}"
            metadata.additional_context = {"file_size_kb": random.randint(100, 5000), "format": "pdf"}
        elif action == AuditAction.CHAT_QUERY:
            metadata.query_text = f"Sample query about insurance policy #{random.randint(1000, 9999)}"
        elif action == AuditAction.CLAIM_VALIDATE:
            metadata.claim_id = f"claim_{uuid.uuid4().hex[:8]}"
            metadata.additional_context = {"claim_amount": round(random.uniform(1000, 50000), 2)}
        elif action == AuditAction.FRAUD_ALERT_VIEW:
            metadata.alert_id = f"alert_{uuid.uuid4().hex[:8]}"
        elif action == AuditAction.COMPLIANCE_SCAN:
            metadata.additional_context = {"documents_scanned": random.randint(10, 100)}

        if status in [AuditStatus.FAILURE, AuditStatus.ERROR]:
            metadata.error_message = random.choice([
                "Permission denied",
                "Resource not found",
                "Invalid request parameters",
                "Service unavailable",
                "Timeout exceeded",
            ])

        log = AuditLog(
            audit_id=f"audit_{uuid.uuid4().hex}",
            timestamp=timestamp.isoformat(),
            workspace_id=workspace_id,
            user_id=user_id,
            user_email=user_email,
            action=action,
            status=status,
            severity=severity,
            resource_type=action.value.split("_")[0],  # e.g., "document", "claim", "fraud"
            resource_id=metadata.document_id or metadata.claim_id or metadata.alert_id,
            description=action_descriptions.get(action, f"Performed {action.value}"),
            metadata=metadata,
        )

        logs.append(log)

    # Sort by timestamp descending
    logs.sort(key=lambda x: x.timestamp, reverse=True)

    return logs


def _apply_filters(
    logs: List[AuditLog],
    request: AuditLogsRequest,
) -> List[AuditLog]:
    """Apply filters to audit logs."""
    filtered = logs

    # Filter by user_id
    if request.user_id_filter:
        filtered = [log for log in filtered if log.user_id == request.user_id_filter]

    # Filter by action
    if request.action_filter:
        filtered = [log for log in filtered if log.action == request.action_filter]

    # Filter by status
    if request.status_filter:
        filtered = [log for log in filtered if log.status == request.status_filter]

    # Filter by severity
    if request.severity_filter:
        filtered = [log for log in filtered if log.severity == request.severity_filter]

    # Filter by date range
    if request.start_date:
        filtered = [log for log in filtered if log.timestamp >= request.start_date]

    if request.end_date:
        filtered = [log for log in filtered if log.timestamp <= request.end_date]

    return filtered


def _compute_summary(logs: List[AuditLog]) -> Dict:
    """Compute summary statistics for audit logs."""
    if not logs:
        return {
            "total_count": 0,
            "by_action": {},
            "by_status": {},
            "by_user": {},
            "by_severity": {},
        }

    action_counts = Counter(log.action.value for log in logs)
    status_counts = Counter(log.status.value for log in logs)
    user_counts = Counter(log.user_id for log in logs)
    severity_counts = Counter(log.severity.value for log in logs)

    return {
        "total_count": len(logs),
        "by_action": dict(action_counts),
        "by_status": dict(status_counts),
        "by_user": dict(user_counts),
        "by_severity": dict(severity_counts),
    }


async def get_audit_logs(request: AuditLogsRequest) -> AuditLogsResponse:
    """
    Retrieve audit logs for a workspace with filtering and pagination.

    Args:
        request: AuditLogsRequest with filters and pagination

    Returns:
        AuditLogsResponse with logs, pagination info, and summary statistics
    """
    logger.info(
        "Retrieving audit logs: workspace=%s user=%s action=%s status=%s severity=%s",
        request.workspace_id,
        request.user_id_filter,
        request.action_filter,
        request.status_filter,
        request.severity_filter,
    )

    # Generate sample data (MVP)
    all_logs = _generate_sample_audit_logs(
        workspace_id=request.workspace_id,
        limit=200,  # Generate larger pool for filtering
    )

    # Apply filters
    filtered_logs = _apply_filters(all_logs, request)

    # Sort
    if request.sort_by == "timestamp":
        filtered_logs.sort(key=lambda x: x.timestamp, reverse=True)
    elif request.sort_by == "action":
        filtered_logs.sort(key=lambda x: x.action.value)
    elif request.sort_by == "status":
        filtered_logs.sort(key=lambda x: x.status.value)

    # Pagination
    total = len(filtered_logs)
    start = request.offset
    end = start + request.limit
    paginated_logs = filtered_logs[start:end]

    # Compute summary
    summary = _compute_summary(filtered_logs)

    logger.info(
        "Audit logs retrieved: total=%d returned=%d",
        total,
        len(paginated_logs),
    )

    return AuditLogsResponse(
        logs=paginated_logs,
        total=total,
        limit=request.limit,
        offset=request.offset,
        has_more=(end < total),
        summary=summary,
    )


async def get_audit_analytics(request: AuditAnalyticsRequest) -> AuditAnalytics:
    """
    Generate analytics summary for audit trail.

    Args:
        request: AuditAnalyticsRequest with date range and parameters

    Returns:
        AuditAnalytics with top actions, active users, and metrics
    """
    logger.info(
        "Generating audit analytics: workspace=%s start=%s end=%s",
        request.workspace_id,
        request.start_date,
        request.end_date,
    )

    # Generate sample data
    all_logs = _generate_sample_audit_logs(
        workspace_id=request.workspace_id,
        limit=500,
    )

    # Filter by date range
    if request.start_date:
        all_logs = [log for log in all_logs if log.timestamp >= request.start_date]
    if request.end_date:
        all_logs = [log for log in all_logs if log.timestamp <= request.end_date]

    total_events = len(all_logs)

    # Calculate success rate
    success_count = sum(1 for log in all_logs if log.status == AuditStatus.SUCCESS)
    success_rate = (success_count / total_events * 100) if total_events > 0 else 0.0

    # Top actions
    action_stats = defaultdict(lambda: {"count": 0, "success": 0, "durations": []})
    for log in all_logs:
        action_stats[log.action]["count"] += 1
        if log.status == AuditStatus.SUCCESS:
            action_stats[log.action]["success"] += 1
        if log.metadata.duration_ms:
            action_stats[log.action]["durations"].append(log.metadata.duration_ms)

    top_actions = []
    for action, stats in action_stats.items():
        success_rate_action = (stats["success"] / stats["count"] * 100) if stats["count"] > 0 else 0.0
        avg_duration = sum(stats["durations"]) / len(stats["durations"]) if stats["durations"] else None
        top_actions.append(
            TopAction(
                action=action,
                count=stats["count"],
                success_rate=success_rate_action,
                avg_duration_ms=avg_duration,
            )
        )

    top_actions.sort(key=lambda x: x.count, reverse=True)
    top_actions = top_actions[:request.top_n]

    # Most active users
    user_stats = defaultdict(lambda: {"count": 0, "last_activity": None, "email": None})
    for log in all_logs:
        user_stats[log.user_id]["count"] += 1
        user_stats[log.user_id]["email"] = log.user_email
        if not user_stats[log.user_id]["last_activity"] or log.timestamp > user_stats[log.user_id]["last_activity"]:
            user_stats[log.user_id]["last_activity"] = log.timestamp

    most_active_users = [
        ActiveUser(
            user_id=user_id,
            user_email=stats["email"],
            action_count=stats["count"],
            last_activity=stats["last_activity"],
        )
        for user_id, stats in user_stats.items()
    ]
    most_active_users.sort(key=lambda x: x.action_count, reverse=True)
    most_active_users = most_active_users[:request.top_n]

    # Error counts
    error_count = sum(1 for log in all_logs if log.status in [AuditStatus.ERROR, AuditStatus.FAILURE])
    critical_count = sum(1 for log in all_logs if log.severity == SeverityLevel.CRITICAL)

    # Average response time
    all_durations = [log.metadata.duration_ms for log in all_logs if log.metadata.duration_ms]
    avg_response_time = sum(all_durations) / len(all_durations) if all_durations else None

    # Period
    timestamps = [log.timestamp for log in all_logs]
    period_start = min(timestamps) if timestamps else datetime.utcnow().isoformat()
    period_end = max(timestamps) if timestamps else datetime.utcnow().isoformat()

    logger.info(
        "Audit analytics generated: total_events=%d success_rate=%.1f%% top_actions=%d",
        total_events,
        success_rate,
        len(top_actions),
    )

    return AuditAnalytics(
        workspace_id=request.workspace_id,
        total_events=total_events,
        success_rate=success_rate,
        top_actions=top_actions,
        most_active_users=most_active_users,
        error_count=error_count,
        critical_count=critical_count,
        avg_response_time_ms=avg_response_time,
        period_start=period_start,
        period_end=period_end,
    )
