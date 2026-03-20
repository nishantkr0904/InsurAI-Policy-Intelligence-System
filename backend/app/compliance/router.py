"""
Compliance Review Router.

Exposes GET /api/v1/compliance/issues and /compliance/report endpoints.

Architecture ref:
  docs/requirements.md #FR019 – Compliance Review
  docs/requirements.md #FR020 – Compliance Report Generation
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.compliance.schemas import (
    RuleCategory,
    IssueStatus,
    SeverityLevel,
    ComplianceIssuesRequest,
    ComplianceIssuesResponse,
    ComplianceReportRequest,
    ComplianceReport,
)
from app.compliance.service import get_compliance_issues, generate_compliance_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compliance", tags=["Compliance"])


@router.get(
    "/issues",
    response_model=ComplianceIssuesResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve compliance issues for a workspace",
    description=(
        "Get compliance issues with optional filtering by status, severity, and category. "
        "Supports pagination and sorting."
    ),
)
async def get_issues_endpoint(
    workspace_id: str = "default",
    status_filter: IssueStatus | None = None,
    severity_filter: SeverityLevel | None = None,
    category_filter: RuleCategory | None = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "detected_date",
) -> ComplianceIssuesResponse:
    """
    Retrieve compliance issues for a workspace.

    Query parameters:
      - workspace_id: Workspace namespace (default: "default")
      - status_filter: Filter by status (open, acknowledged, in_progress, resolved, waived)
      - severity_filter: Filter by severity (low, medium, high, critical)
      - category_filter: Filter by category (data_privacy, security, coverage, etc.)
      - limit: Maximum results (1-500, default: 50)
      - offset: Result offset for pagination (default: 0)
      - sort_by: Sort field (detected_date, severity, affected_records)

    Response:
      - issues: List of ComplianceIssue objects with full details
      - total: Total number of matching issues
      - limit, offset: Pagination info
      - has_more: Whether more results exist
      - summary: Statistics (counts by severity, status, category)

    Errors:
      - 400: Invalid query parameters
      - 503: Service unavailable
    """
    logger.info(
        "Compliance issues request: workspace=%s status=%s severity=%s category=%s limit=%d offset=%d",
        workspace_id,
        status_filter,
        severity_filter,
        category_filter,
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

    try:
        request = ComplianceIssuesRequest(
            workspace_id=workspace_id,
            status_filter=status_filter,
            severity_filter=severity_filter,
            category_filter=category_filter,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
        )
        result = await get_compliance_issues(request)
    except Exception as exc:
        logger.error("Failed to retrieve compliance issues: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Compliance service unavailable: {exc}",
        ) from exc

    logger.info(
        "Compliance issues returned: total=%d returned=%d",
        result.total,
        len(result.issues),
    )

    return result


@router.get(
    "/report",
    response_model=ComplianceReport,
    status_code=status.HTTP_200_OK,
    summary="Generate a comprehensive compliance audit report",
    description=(
        "Generate a detailed compliance report with executive summary, "
        "category breakdown, top issues, and recommendations."
    ),
)
async def get_report_endpoint(
    workspace_id: str = "default",
    include_resolved: bool = False,
) -> ComplianceReport:
    """
    Generate a comprehensive compliance audit report.

    Query parameters:
      - workspace_id: Workspace namespace (default: "default")
      - include_resolved: Include resolved issues in report (default: false)

    Response includes:
      - report_id: Unique report identifier
      - generated_date: ISO 8601 generation timestamp
      - executive_summary: Compliance score, issue counts, remediation rate
      - category_breakdown: Issues by category with averages
      - top_issues: Top 5 critical/high issues
      - recommendations: Prioritized remediation actions
      - detailed_issues: Complete issue list for drill-down

    Errors:
      - 503: Service unavailable
    """
    logger.info(
        "Compliance report request: workspace=%s include_resolved=%s",
        workspace_id,
        include_resolved,
    )

    try:
        request = ComplianceReportRequest(
            workspace_id=workspace_id,
            include_resolved=include_resolved,
        )
        result = await generate_compliance_report(request)
    except Exception as exc:
        logger.error("Failed to generate compliance report: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Compliance report generation failed: {exc}",
        ) from exc

    logger.info(
        "Compliance report generated: workspace=%s compliance_score=%.1f total_issues=%d",
        result.workspace_id,
        result.executive_summary.compliance_score,
        result.executive_summary.total_issues,
    )

    return result
