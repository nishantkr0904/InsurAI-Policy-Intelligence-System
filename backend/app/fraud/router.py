"""
Fraud Detection Router.

Exposes GET /api/v1/fraud/alerts endpoint for fraud alert retrieval and analysis.
Exposes PATCH /api/v1/fraud/alerts/{alert_id}/status for status updates.

Architecture ref:
  docs/requirements.md #FR016 – Fraud Pattern Detection
  docs/requirements.md #FR017 – Fraud Alert Generation
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.fraud.schemas import (
    AnomalyType,
    AlertStatus,
    SeverityLevel,
    FraudAlertsRequest,
    FraudAlertsResponse,
    FraudAlertStatusUpdate,
    FraudAlertStatusResponse,
)
from app.fraud.service import get_fraud_alerts
from app.models import AuditLog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/fraud", tags=["Fraud Detection"])


@router.get(
    "/alerts",
    response_model=FraudAlertsResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve fraud alerts for a workspace",
    description=(
        "Get fraud alerts with optional filtering by status, severity, and risk score. "
        "Supports pagination and sorting."
    ),
)
async def get_alerts_endpoint(
    workspace_id: str = "default",
    status_filter: AlertStatus | None = None,
    severity_filter: SeverityLevel | None = None,
    min_risk_score: float = 0.0,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "detected_date",
    session: AsyncSession = Depends(get_db),
) -> FraudAlertsResponse:
    """
    Retrieve fraud alerts for a workspace.

    Query parameters:
      - workspace_id: Workspace namespace (default: "default")
      - status_filter: Filter by status (new, under_review, escalated, resolved, false_positive)
      - severity_filter: Filter by severity (low, medium, high, critical)
      - min_risk_score: Minimum fraud risk score (0-100)
      - limit: Maximum results (1-500, default: 50)
      - offset: Result offset for pagination (default: 0)
      - sort_by: Sort field (detected_date, risk_score, claim_amount)

    Response:
      - alerts: List of FraudAlert objects with:
        - alert_id, claim_id, policy_number
        - risk_score (0-100), severity, anomaly_types
        - status, reasoning, confidence_score
        - related_claims with similarity scores
      - total: Total number of alerts matching filters
      - limit, offset: Pagination info
      - has_more: Whether more results exist

    Errors:
      - 400: Invalid query parameters
      - 503: Service unavailable
    """
    logger.info(
        "Fraud alerts request: workspace=%s status=%s severity=%s min_risk=%.1f limit=%d offset=%d",
        workspace_id,
        status_filter,
        severity_filter,
        min_risk_score,
        limit,
        offset,
    )

    # Validate parameters
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 500",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset must be >= 0",
        )
    if min_risk_score < 0 or min_risk_score > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_risk_score must be between 0 and 100",
        )

    try:
        request = FraudAlertsRequest(
            workspace_id=workspace_id,
            status_filter=status_filter,
            severity_filter=severity_filter,
            min_risk_score=min_risk_score,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
        )
        result = await get_fraud_alerts(request, session)
    except Exception as exc:
        logger.error("Failed to retrieve fraud alerts: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Fraud alert service unavailable: {exc}",
        ) from exc

    logger.info(
        "Fraud alerts returned: total=%d returned=%d",
        result.total,
        len(result.alerts),
    )

    return result


# ---------------------------------------------------------------------------
# Status Update Endpoint
# ---------------------------------------------------------------------------

# In-memory store for demo mode (simulates database updates)
_DEMO_ALERT_STATUS: dict[str, AlertStatus] = {}


@router.patch(
    "/alerts/{alert_id}/status",
    response_model=FraudAlertStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Update fraud alert status",
    description=(
        "Update the status of a fraud alert (escalate, resolve, dismiss). "
        "Logs an audit entry for tracking."
    ),
)
async def update_alert_status(
    alert_id: str,
    body: FraudAlertStatusUpdate,
    session: AsyncSession = Depends(get_db),
) -> FraudAlertStatusResponse:
    """
    Update the status of a fraud alert.

    Path parameters:
      - alert_id: Unique alert identifier

    Request body:
      - status: New status (new, under_review, escalated, resolved, false_positive)
      - notes: Optional investigation notes
      - workspace_id: Workspace namespace

    Response:
      - alert_id: Alert ID
      - status: New status
      - previous_status: Previous status
      - updated_at: ISO 8601 timestamp
      - message: Confirmation message

    Also logs an audit entry with action="fraud_status_updated".
    """
    logger.info(
        "Updating fraud alert status: alert_id=%s new_status=%s workspace=%s",
        alert_id,
        body.status.value,
        body.workspace_id,
    )

    # Demo mode: use in-memory store
    previous_status = _DEMO_ALERT_STATUS.get(alert_id, AlertStatus.NEW)
    _DEMO_ALERT_STATUS[alert_id] = body.status

    updated_at = datetime.utcnow().isoformat()

    # Log audit entry
    try:
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            action="fraud_status_updated",
            actor_id="system",
            actor_type="user",
            resource_type="fraud_alert",
            resource_id=alert_id,
            workspace_id=body.workspace_id,
            severity="info" if body.status != AlertStatus.ESCALATED else "warning",
            status="success",
            metadata={
                "previous_status": previous_status.value,
                "new_status": body.status.value,
                "notes": body.notes,
            },
        )
        session.add(audit_log)
        await session.commit()
        logger.info("Audit log created for fraud alert status update: %s", alert_id)
    except Exception as exc:
        logger.warning("Failed to create audit log: %s", exc)
        # Don't fail the request if audit logging fails

    # Generate status-specific message
    status_messages = {
        AlertStatus.ESCALATED: f"Alert {alert_id} has been escalated for senior review",
        AlertStatus.RESOLVED: f"Alert {alert_id} has been resolved",
        AlertStatus.FALSE_POSITIVE: f"Alert {alert_id} marked as false positive",
        AlertStatus.UNDER_REVIEW: f"Alert {alert_id} is now under review",
        AlertStatus.NEW: f"Alert {alert_id} status reset to new",
    }

    return FraudAlertStatusResponse(
        alert_id=alert_id,
        status=body.status,
        previous_status=previous_status,
        updated_at=updated_at,
        message=status_messages.get(body.status, f"Alert {alert_id} status updated"),
    )
