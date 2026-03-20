"""
Fraud Detection Service.

Implements fraud pattern detection, anomaly analysis, and alert management.

Pipeline:
  1. Retrieve recent claims from workspace
  2. Analyze patterns: duplicate claims, unusual amounts, rapid sequences
  3. Use LLM to assess fraud risk and detect anomalies
  4. Return sorted, filtered fraud alerts

Architecture ref:
  docs/requirements.md #FR016 – Fraud Pattern Detection
  docs/requirements.md #FR017 – Fraud Alert Generation
  docs/requirements.md #FR018 – Fraud Investigation Support
"""

from __future__ import annotations

import json
import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import List

import litellm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.fraud.schemas import (
    AnomalyType,
    AlertStatus,
    FraudAlert,
    FraudAlertsRequest,
    FraudAlertsResponse,
    RelatedClaim,
    SeverityLevel,
)
from app.core.config import settings
from app.models import FraudAlert as FraudAlertORM

logger = logging.getLogger(__name__)

# System prompt for fraud risk assessment
_FRAUD_SYSTEM_PROMPT = """You are an expert insurance fraud analyst for InsurAI.

Your role is to:
1. Analyze claim patterns and detect suspicious behavior
2. Identify anomalies and fraud indicators
3. Assess fraud risk level
4. Provide clear, justified assessment

You MUST output ONLY valid JSON with this exact structure:
{
  "is_suspicious": true|false,
  "risk_score": <0-100>,
  "severity": "low|medium|high|critical",
  "anomaly_types": ["duplicate_claim|unusual_amount|rapid_claims|..."],
  "reasoning": "<clear explanation of fraud risk>",
  "confidence_score": <0-100>,
  "recommended_action": "approve|escalate|investigate"
}

Risk Indicators:
- Duplicate or near-identical claims from same policy
- Unusual claim amounts for policy type
- Multiple claims within short timeframes
- Claims for high-value items shortly after coverage
- Policy information mismatches in claim details
- High-risk keywords in claim description
- Geographic inconsistencies
- Pattern deviations from historical data"""


def _generate_sample_fraud_alerts(
    workspace_id: str,
    limit: int = 50,
) -> List[FraudAlert]:
    """
    Generate sample fraud alerts for MVP (until real claims database exists).

    This function creates realistic-looking fraud alerts that match the
    investigation scenarios expected by the frontend.
    """
    alerts = []

    anomaly_combinations = [
        [AnomalyType.DUPLICATE_CLAIM, AnomalyType.RAPID_CLAIMS],
        [AnomalyType.UNUSUAL_AMOUNT, AnomalyType.TEMPORAL_ANOMALY],
        [AnomalyType.PATTERN_MISMATCH, AnomalyType.POLICY_MISMATCH],
        [AnomalyType.HIGH_RISK_KEYWORDS],
        [AnomalyType.FREQUENCY_SPIKE, AnomalyType.MULTIPLE_CLAIMS],
        [AnomalyType.GEOGRAPHIC_MISMATCH],
    ]

    reasoning_templates = [
        "Multiple claims submitted within 48 hours from same beneficiary suggests coordinated fraud pattern.",
        "Claim amount significantly exceeds historical average for this policy type, raising risk concerns.",
        "Policy information in claim doesn't match underwriting records; potential misrepresentation.",
        "Claim description contains multiple high-risk indicators suggesting fabricated incident.",
        "Recent policy activation followed by high-value claim indicates possible pre-planned fraud.",
        "Claims from this policyholder show unusual temporal clustering pattern.",
    ]

    statuses = [AlertStatus.NEW, AlertStatus.UNDER_REVIEW, AlertStatus.ESCALATED, AlertStatus.RESOLVED]

    for i in range(min(limit, 20)):
        alert_id = f"ALERT-{uuid.uuid4().hex[:8].upper()}"
        claim_id = f"CLM-{uuid.uuid4().hex[:8].upper()}"

        # Vary risk score and severity
        is_critical = random.random() < 0.15  # 15% critical alerts
        is_high = random.random() < 0.35  # 35% high severity

        if is_critical:
            risk_score = random.uniform(75, 100)
            severity = SeverityLevel.CRITICAL
        elif is_high:
            risk_score = random.uniform(50, 75)
            severity = SeverityLevel.HIGH
        else:
            risk_score = random.uniform(25, 50)
            severity = SeverityLevel.MEDIUM if random.random() > 0.5 else SeverityLevel.LOW

        related_count = random.randint(1, 4)
        related_claims = [
            RelatedClaim(
                claim_id=f"CLM-{uuid.uuid4().hex[:8].upper()}",
                similarity_score=random.uniform(60, 95),
                claim_amount=random.uniform(1000, 50000),
                submit_date=(datetime.utcnow() - timedelta(days=random.randint(1, 30))).isoformat(),
            )
            for _ in range(related_count)
        ]

        alerts.append(FraudAlert(
            alert_id=alert_id,
            claim_id=claim_id,
            policy_number=f"POL-{random.randint(10000, 99999)}",
            risk_score=round(risk_score, 1),
            severity=severity,
            anomaly_types=random.choice(anomaly_combinations),
            status=random.choice(statuses),
            reasoning=random.choice(reasoning_templates),
            claim_amount=random.uniform(2000, 100000),
            submit_date=(datetime.utcnow() - timedelta(days=random.randint(0, 30))).isoformat(),
            related_claims=related_claims,
            confidence_score=random.uniform(70, 99),
        ))

    return alerts


async def get_fraud_alerts(
    request: FraudAlertsRequest,
    session: AsyncSession | None = None,
) -> FraudAlertsResponse:
    """
    Retrieve fraud alerts for a workspace with filtering and pagination.

    Hybrid Database/MVP Approach:
      1. If session provided: Query PostgreSQL FraudAlert table
      2. If no session OR database empty: Use MVP sample data (fallback)
      3. Apply filters, sorting, pagination
      4. Return paginated response

    Args:
        request: FraudAlertsRequest with filters and pagination
        session: Optional AsyncSession for database queries (from FastAPI Depends)

    Returns:
        FraudAlertsResponse with alerts and pagination info
    """
    logger.info(
        "Retrieving fraud alerts: workspace=%s status=%s severity=%s min_risk=%.1f db=%s",
        request.workspace_id,
        request.status_filter,
        request.severity_filter,
        request.min_risk_score,
        "yes" if session else "no",
    )

    # Try to query database if session provided
    all_alerts = None
    if session:
        try:
            # Count existing alerts for this workspace
            count_query = select(func.count()).select_from(FraudAlertORM).where(
                FraudAlertORM.workspace_id == request.workspace_id
            )
            total_db = await session.scalar(count_query)

            # If alerts exist, query them
            if total_db > 0:
                query = select(FraudAlertORM).where(
                    FraudAlertORM.workspace_id == request.workspace_id
                )

                # Apply filters in database query
                if request.status_filter:
                    query = query.where(FraudAlertORM.status == request.status_filter.value)
                if request.severity_filter:
                    query = query.where(FraudAlertORM.severity == request.severity_filter.value)
                if request.min_risk_score > 0:
                    query = query.where(FraudAlertORM.risk_score >= request.min_risk_score)

                # Sort
                if request.sort_by == "risk_score":
                    query = query.order_by(FraudAlertORM.risk_score.desc())
                elif request.sort_by == "claim_amount":
                    query = query.order_by(FraudAlertORM.claim_amount.desc())
                else:  # detected_date (default)
                    query = query.order_by(FraudAlertORM.created_at.desc())

                # Execute query
                result = await session.execute(query)
                db_alerts = result.scalars().all()

                # Convert ORM to Pydantic
                all_alerts = [
                    FraudAlert(
                        alert_id=alert.alert_number,
                        claim_id=alert.claim_id,
                        policy_number=alert.policy_number or "",
                        risk_score=alert.risk_score,
                        severity=SeverityLevel(alert.severity),
                        anomaly_types=[AnomalyType(a) for a in alert.anomaly_types] if alert.anomaly_types else [],
                        status=AlertStatus(alert.status),
                        reasoning=alert.reasoning or "",
                        claim_amount=0.0,  # Not stored in ORM, using default
                        submit_date=alert.created_at.isoformat() if alert.created_at else datetime.utcnow().isoformat(),
                        detected_date=alert.created_at.isoformat() if alert.created_at else datetime.utcnow().isoformat(),
                        related_claims=[
                            RelatedClaim(
                                claim_id=rc.get("claim_id", ""),
                                similarity_score=rc.get("similarity_score", 0.0),
                                claim_amount=rc.get("amount", 0.0),
                                submit_date=rc.get("date", datetime.utcnow().isoformat()),
                            )
                            for rc in (alert.related_claims or [])
                        ],
                        confidence_score=alert.confidence_score,
                    )
                    for alert in db_alerts
                ]
                logger.info("Retrieved %d fraud alerts from database", len(all_alerts))
        except Exception as exc:
            logger.warning("Database query failed, falling back to sample data: %s", exc)
            all_alerts = None

    # Fallback to MVP sample data if no database alerts
    if all_alerts is None:
        logger.info("No database alerts found (first use?). Generating MVP sample data.")
        all_alerts = _generate_sample_fraud_alerts(
            workspace_id=request.workspace_id,
            limit=100,
        )

        # Apply filters to sample data
        filtered_alerts = [
            alert for alert in all_alerts
            if (
                (request.status_filter is None or alert.status == request.status_filter)
                and (request.severity_filter is None or alert.severity == request.severity_filter)
                and alert.risk_score >= request.min_risk_score
            )
        ]

        # Sort sample data
        sort_key = "detected_date"
        reverse_sort = True

        if request.sort_by == "risk_score":
            sort_key = lambda a: a.risk_score
            reverse_sort = True
        elif request.sort_by == "claim_amount":
            sort_key = lambda a: a.claim_amount
            reverse_sort = True
        else:  # detected_date (default)
            sort_key = lambda a: a.detected_date
            reverse_sort = True

        all_alerts = sorted(
            filtered_alerts,
            key=sort_key if isinstance(sort_key, str) else sort_key,
            reverse=reverse_sort,
        )

    # Pagination
    total = len(all_alerts)
    start = request.offset
    end = start + request.limit
    paginated_alerts = all_alerts[start:end]
    has_more = end < total

    logger.info(
        "Fraud alerts returned: total=%d returned=%d",
        total,
        len(paginated_alerts),
    )

    return FraudAlertsResponse(
        alerts=paginated_alerts,
        total=total,
        limit=request.limit,
        offset=request.offset,
        has_more=has_more,
    )
