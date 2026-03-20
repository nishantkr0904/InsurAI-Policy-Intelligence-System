"""
Compliance Detection Service.

Implements compliance issue detection, violation tracking, and report generation.

Pipeline:
  1. Retrieve stored compliance violations from PostgreSQL
  2. Categorize by compliance rule
  3. Apply filters and pagination
  4. Generate reports with recommendations
  5. Return structured response

Hybrid Database/MVP Approach:
  - Tries PostgreSQL queries first (if session provided)
  - Falls back to MVP sample data if no session or database empty

Architecture ref:
  docs/requirements.md #FR019 – Compliance Review
  docs/requirements.md #FR020 – Compliance Report Generation
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.compliance.schemas import (
    RuleCategory,
    IssueStatus,
    SeverityLevel,
    ComplianceIssue,
    ComplianceIssuesRequest,
    ComplianceIssuesResponse,
    ComplianceReportRequest,
    ComplianceReport,
    ExecutiveSummary,
    CategoryBreakdown,
    RiskRecommendation,
)
from app.models import ComplianceIssue as ComplianceIssueORM

import logging

logger = logging.getLogger(__name__)


def _generate_sample_compliance_issues(
    workspace_id: str,
    limit: int = 100,
) -> List[ComplianceIssue]:
    """
    Generate sample compliance issues for MVP (until real audit database exists).

    Creates realistic-looking compliance violations that match regulatory
    requirements for insurance policies.
    """
    issues = []

    rule_templates = {
        RuleCategory.DATA_PRIVACY: [
            ("Missing PII encryption in data at rest", "Encryption must be AES-256 or equivalent"),
            ("Inadequate data retention policy", "Personal data retention exceeds legal limits"),
            ("Missing consent records for data processing", "GDPR/CCPA requires explicit consent"),
        ],
        RuleCategory.SECURITY: [
            ("Insufficient access controls", "Role-based access control (RBAC) not fully implemented"),
            ("Missing audit logging", "All administrative actions must be logged"),
            ("Weak password requirements", "Minimum 12 characters with complexity required"),
        ],
        RuleCategory.COVERAGE: [
            ("Ambiguous coverage limits in policy", "Coverage limits must be clearly defined"),
            ("Missing exclusion details", "All exclusions must be prominently disclosed"),
            ("Incomplete rider documentation", "Rider terms and conditions inadequately documented"),
        ],
        RuleCategory.EXCLUSIONS: [
            ("Unlawful exclusion identified", "Exclusion violates state insurance regulations"),
            ("Contradictory exclusion clauses", "Multiple exclusions conflict with each other"),
            ("Missing state-specific exclusions", "Federal exclusions override state requirements"),
        ],
        RuleCategory.DISCLOSURE: [
            ("Missing required disclosures", "Insured not informed of material facts"),
            ("Inadequate communication of changes", "Policy modifications not properly disclosed"),
            ("Unclear terms and conditions", "Fine print violates readability standards"),
        ],
        RuleCategory.CLAIMS_HANDLING: [
            ("Claims process not transparent", "Claim status updates not provided per regulations"),
            ("Insufficient documentation requirements", "Required documentation not clearly listed"),
            ("Unreasonable claim timeout", "Claim decision timeline exceeds state limits"),
        ],
        RuleCategory.UNDERWRITING: [
            ("Missing underwriting standards", "Underwriting guidelines not documented"),
            ("Inconsistent risk assessment", "Risk scores vary without clear methodology"),
            ("Discrimination risk in pricing", "Rate differences not justified by actuarial data"),
        ],
        RuleCategory.RETENTION: [
            ("Records retention too short", "Policy records must be retained for 7 years"),
            ("Missing claim file documentation", "All claim support documents not retained"),
            ("Inadequate backup procedures", "Disaster recovery plan not established"),
        ],
    }

    remediation_templates = [
        "Implement encryption for all sensitive data fields",
        "Establish written compliance procedures document",
        "Conduct staff training on regulatory requirements",
        "Audit and update policy documentation",
        "System implementation to track compliance metrics",
        "Third-party compliance assessment recommended",
        "Legal review of policy language required",
    ]

    statuses = [
        IssueStatus.OPEN,
        IssueStatus.OPEN,
        IssueStatus.OPEN,
        IssueStatus.ACKNOWLEDGED,
        IssueStatus.IN_PROGRESS,
        IssueStatus.RESOLVED,
        IssueStatus.RESOLVED,
    ]

    categories = list(RuleCategory)

    for i in range(min(limit, 30)):
        category = random.choice(categories)
        rule_name, description = random.choice(rule_templates[category])

        # Vary severity
        is_critical = random.random() < 0.10  # 10% critical
        is_high = random.random() < 0.30  # 30% high

        if is_critical:
            severity = SeverityLevel.CRITICAL
        elif is_high:
            severity = SeverityLevel.HIGH
        else:
            severity = (
                SeverityLevel.MEDIUM
                if random.random() > 0.5
                else SeverityLevel.LOW
            )

        status = random.choice(statuses)
        days_open = random.randint(1, 90) if status != IssueStatus.RESOLVED else 0

        issues.append(ComplianceIssue(
            issue_id=f"CI-{uuid.uuid4().hex[:8].upper()}",
            rule_name=rule_name,
            rule_category=category,
            description=description,
            severity=severity,
            status=status,
            policy_id=f"POL-{random.randint(10000, 99999)}",
            document_section=f"Section {random.randint(1, 15)}.{random.randint(1, 5)}",
            detected_date=(
                datetime.utcnow() - timedelta(days=days_open)
            ).isoformat(),
            due_date=(
                datetime.utcnow() + timedelta(days=random.randint(7, 60))
            ).isoformat() if status in [IssueStatus.OPEN, IssueStatus.ACKNOWLEDGED] else None,
            remediation_steps=random.sample(remediation_templates, k=random.randint(1, 3)),
            affected_records=random.randint(1, 100) if severity == SeverityLevel.CRITICAL else 0,
        ))

    return issues


async def get_compliance_issues(
    request: ComplianceIssuesRequest,
    session: AsyncSession | None = None,
) -> ComplianceIssuesResponse:
    """
    Retrieve compliance issues for a workspace with filtering and pagination.

    Hybrid Database/MVP Approach:
      1. If session provided: Query PostgreSQL ComplianceIssue table
      2. If no session OR database empty: Use MVP sample data (fallback)
      3. Apply filters, sorting, pagination
      4. Return paginated response with summary

    Args:
        request: ComplianceIssuesRequest with filters and pagination
        session: Optional AsyncSession for database queries (from FastAPI Depends)

    Returns:
        ComplianceIssuesResponse with issues and pagination info
    """
    logger.info(
        "Retrieving compliance issues: workspace=%s status=%s severity=%s category=%s db=%s",
        request.workspace_id,
        request.status_filter,
        request.severity_filter,
        request.category_filter,
        "yes" if session else "no",
    )

    all_issues = None
    if session:
        try:
            count_query = select(func.count()).select_from(ComplianceIssueORM).where(
                ComplianceIssueORM.workspace_id == request.workspace_id
            )
            total_db = await session.scalar(count_query)

            if total_db > 0:
                query = select(ComplianceIssueORM).where(
                    ComplianceIssueORM.workspace_id == request.workspace_id
                )

                if request.status_filter:
                    query = query.where(ComplianceIssueORM.status == request.status_filter.value)
                if request.severity_filter:
                    query = query.where(ComplianceIssueORM.severity == request.severity_filter.value)
                if request.category_filter:
                    query = query.where(ComplianceIssueORM.rule_category == request.category_filter.value)

                if request.sort_by == "severity":
                    query = query.order_by(ComplianceIssueORM.severity.asc())
                elif request.sort_by == "affected_records":
                    query = query.order_by(ComplianceIssueORM.created_at.desc())
                else:
                    query = query.order_by(ComplianceIssueORM.created_at.desc())

                result = await session.execute(query)
                db_issues = result.scalars().all()

                all_issues = [
                    ComplianceIssue(
                        issue_id=issue.issue_number,
                        rule_name=issue.title or "",
                        rule_category=RuleCategory(issue.rule_category),
                        description=issue.description or "",
                        severity=SeverityLevel(issue.severity),
                        status=IssueStatus(issue.status),
                        policy_id=issue.policy_number,
                        document_section=None,
                        detected_date=issue.created_at.isoformat() if issue.created_at else datetime.utcnow().isoformat(),
                        due_date=issue.remediation_deadline.isoformat() if issue.remediation_deadline else None,
                        remediation_steps=[issue.required_remediation] if issue.required_remediation else [],
                        affected_records=len(issue.affected_policies) if issue.affected_policies else 0,
                    )
                    for issue in db_issues
                ]
                logger.info("Retrieved %d compliance issues from database", len(all_issues))
        except Exception as exc:
            logger.warning("Database query failed, falling back to sample data: %s", exc)
            all_issues = None

    if all_issues is None:
        logger.info("No database issues found (first use?). Generating MVP sample data.")
        all_issues = _generate_sample_compliance_issues(
            workspace_id=request.workspace_id,
            limit=100,
        )

        filtered_issues = [
            issue for issue in all_issues
            if (
                (request.status_filter is None or issue.status == request.status_filter)
                and (request.severity_filter is None or issue.severity == request.severity_filter)
                and (request.category_filter is None or issue.rule_category == request.category_filter)
            )
        ]

        if request.sort_by == "severity":
            severity_order = {
                SeverityLevel.CRITICAL: 0,
                SeverityLevel.HIGH: 1,
                SeverityLevel.MEDIUM: 2,
                SeverityLevel.LOW: 3,
            }
            all_issues = sorted(filtered_issues, key=lambda x: severity_order[x.severity])
        elif request.sort_by == "affected_records":
            all_issues = sorted(filtered_issues, key=lambda x: x.affected_records, reverse=True)
        else:
            all_issues = sorted(filtered_issues, key=lambda x: x.detected_date, reverse=True)

    total = len(all_issues)
    paginated_issues = all_issues[request.offset : request.offset + request.limit]
    has_more = (request.offset + request.limit) < total

    summary = {
        "total_count": total,
        "by_severity": {
            "critical": sum(1 for i in all_issues if i.severity == SeverityLevel.CRITICAL),
            "high": sum(1 for i in all_issues if i.severity == SeverityLevel.HIGH),
            "medium": sum(1 for i in all_issues if i.severity == SeverityLevel.MEDIUM),
            "low": sum(1 for i in all_issues if i.severity == SeverityLevel.LOW),
        },
        "by_status": {
            "open": sum(1 for i in all_issues if i.status == IssueStatus.OPEN),
            "acknowledged": sum(1 for i in all_issues if i.status == IssueStatus.ACKNOWLEDGED),
            "in_progress": sum(1 for i in all_issues if i.status == IssueStatus.IN_PROGRESS),
            "resolved": sum(1 for i in all_issues if i.status == IssueStatus.RESOLVED),
        },
        "by_category": {
            cat.value: sum(1 for i in all_issues if i.rule_category == cat)
            for cat in RuleCategory
        },
    }

    logger.info("Compliance issues returned: total=%d returned=%d", total, len(paginated_issues))

    return ComplianceIssuesResponse(
        issues=paginated_issues,
        total=total,
        limit=request.limit,
        offset=request.offset,
        has_more=has_more,
        summary=summary,
    )


async def generate_compliance_report(
    request: ComplianceReportRequest,
    session: AsyncSession | None = None,
) -> ComplianceReport:
    """
    Generate a comprehensive compliance audit report.

    Aggregates all compliance issues, computes metrics, and provides
    recommendations for remediation.

    Args:
        request: ComplianceReportRequest with workspace and options
        session: Optional AsyncSession for database queries

    Returns:
        ComplianceReport with executive summary and recommendations
    """
    logger.info("Generating compliance report: workspace=%s", request.workspace_id)

    issues_request = ComplianceIssuesRequest(
        workspace_id=request.workspace_id,
        limit=1000,
        offset=0,
    )
    issues_response = await get_compliance_issues(issues_request, session)
    all_issues = issues_response.issues

    issues = (
        all_issues
        if request.include_resolved
        else [i for i in all_issues if i.status != IssueStatus.RESOLVED]
    )

    critical_weight = 0
    high_weight = sum(1 for i in issues if i.severity == SeverityLevel.HIGH)
    medium_weight = sum(1 for i in issues if i.severity == SeverityLevel.MEDIUM) * 0.5
    resolved_count = sum(1 for i in all_issues if i.status == IssueStatus.RESOLVED)
    total_count = len(all_issues)

    total_risk = critical_weight * 10 + high_weight * 5 + medium_weight
    compliance_score = max(0, 100 - (total_risk * 5))

    category_breakdown = []
    for category in RuleCategory:
        category_issues = [i for i in issues if i.rule_category == category]
        if category_issues:
            days_open = [
                (datetime.utcnow() - datetime.fromisoformat(i.detected_date.replace("Z", "+00:00"))).days
                for i in category_issues
            ]
            avg_days = sum(days_open) / len(days_open) if days_open else 0

            category_breakdown.append(
                CategoryBreakdown(
                    category=category,
                    issue_count=len(category_issues),
                    critical_count=sum(1 for i in category_issues if i.severity == SeverityLevel.CRITICAL),
                    high_count=sum(1 for i in category_issues if i.severity == SeverityLevel.HIGH),
                    average_days_open=avg_days,
                )
            )

    top_issues = sorted(
        issues,
        key=lambda x: (x.severity == SeverityLevel.CRITICAL, x.severity == SeverityLevel.HIGH),
        reverse=True,
    )[:5]

    recommendations = [
        RiskRecommendation(
            priority=1,
            action="Immediately address all critical severity issues",
            impact="high",
            timeline="Within 7 days",
        ),
        RiskRecommendation(
            priority=2,
            action="Establish compliance monitoring dashboard",
            impact="high",
            timeline="Within 30 days",
        ),
        RiskRecommendation(
            priority=3,
            action="Conduct staff training on compliance requirements",
            impact="medium",
            timeline="Within 60 days",
        ),
        RiskRecommendation(
            priority=4,
            action="Schedule quarterly compliance audits",
            impact="medium",
            timeline="Ongoing",
        ),
    ]

    return ComplianceReport(
        report_id=f"CR-{uuid.uuid4().hex[:8].upper()}",
        workspace_id=request.workspace_id,
        executive_summary=ExecutiveSummary(
            compliance_score=round(compliance_score, 1),
            total_issues=len(issues),
            critical_count=sum(1 for i in issues if i.severity == SeverityLevel.CRITICAL),
            high_count=sum(1 for i in issues if i.severity == SeverityLevel.HIGH),
            medium_count=sum(1 for i in issues if i.severity == SeverityLevel.MEDIUM),
            low_count=sum(1 for i in issues if i.severity == SeverityLevel.LOW),
            remediation_rate=round((resolved_count / total_count * 100) if total_count > 0 else 0, 1),
            last_audit_date=datetime.utcnow().isoformat(),
        ),
        category_breakdown=category_breakdown,
        top_issues=top_issues,
        recommendations=recommendations,
        detailed_issues=issues,
    )
