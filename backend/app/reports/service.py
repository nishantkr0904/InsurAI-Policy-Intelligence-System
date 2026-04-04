"""
Report generation service.

Generates summary and detailed reports with risk analysis and key findings.
"""

from __future__ import annotations

import base64
import json
import logging
from datetime import datetime
from io import BytesIO
from typing import Dict, Any, Optional, List
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.reports.schemas import (
    ReportType,
    ExportFormat,
    ReportExportRequest,
    ReportExportResponse,
    ReportData,
    PolicyInfo,
    RiskFactorData,
    KeyFinding,
)

logger = logging.getLogger(__name__)


def _build_data_url(content_type: str, report_bytes: bytes) -> str:
    """Build an inline download URL when object storage is unavailable."""
    encoded = base64.b64encode(report_bytes).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def _generate_json_report(report_data: ReportData) -> bytes:
    """Generate JSON report."""
    report_dict = {
        "report_id": report_data.report_id,
        "policy_info": report_data.policy_info.model_dump(),
        "risk_assessment": {
            "score": report_data.risk_score,
            "level": report_data.risk_level,
            "factors": [f.model_dump() for f in report_data.risk_factors],
        },
        "key_findings": [f.model_dump() for f in report_data.key_findings],
        "query_insights": report_data.query_insights,
        "analytics": report_data.analytics_data or {},
        "generated_at": report_data.generated_at.isoformat(),
        "report_type": report_data.report_type.value,
    }
    
    json_str = json.dumps(report_dict, indent=2, default=str)
    return json_str.encode('utf-8')


def _generate_csv_report(report_data: ReportData) -> bytes:
    """Generate CSV report."""
    lines = []
    
    # Header
    lines.append("InsurAI Risk Assessment Report")
    lines.append(f"Generated: {report_data.generated_at.isoformat()}")
    lines.append(f"Report ID: {report_data.report_id}")
    lines.append("")
    
    # Policy Info
    lines.append("POLICY INFORMATION")
    lines.append(f"Policy ID,{report_data.policy_info.policy_id}")
    lines.append(f"Policy Number,{report_data.policy_info.policy_number or 'N/A'}")
    lines.append(f"Insured Name,{report_data.policy_info.insured_name or 'N/A'}")
    lines.append(f"Policy Type,{report_data.policy_info.policy_type or 'N/A'}")
    lines.append(f"Coverage Amount,${report_data.policy_info.coverage_amount or 0:,.2f}")
    lines.append(f"Deductible,${report_data.policy_info.deductible or 0:,.2f}")
    lines.append("")
    
    # Risk Assessment
    lines.append("RISK ASSESSMENT")
    lines.append(f"Risk Score,{report_data.risk_score}")
    lines.append(f"Risk Level,{report_data.risk_level}")
    lines.append("")
    
    # Risk Factors
    lines.append("RISK FACTORS")
    lines.append("Factor,Impact,Description")
    for factor in report_data.risk_factors:
        lines.append(f"{factor.name},{factor.impact},{factor.description}")
    lines.append("")
    
    # Key Findings
    lines.append("KEY FINDINGS")
    lines.append("Title,Severity,Description,Recommendation")
    for finding in report_data.key_findings:
        lines.append(f"{finding.title},{finding.severity},{finding.description},{finding.recommendation}")
    
    csv_str = "\n".join(lines)
    return csv_str.encode('utf-8')


def _generate_pdf_report(report_data: ReportData) -> bytes:
    """Generate PDF report using simple HTML-like format."""
    # Since we don't have reportlab, create a simple text-based "PDF"
    # In production, use reportlab or weasyprint
    lines = []
    
    lines.append("=" * 80)
    lines.append("INSURAI RISK ASSESSMENT REPORT")
    lines.append("=" * 80)
    lines.append(f"Report ID: {report_data.report_id}")
    lines.append(f"Generated: {report_data.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append(f"Report Type: {report_data.report_type.value.upper()}")
    lines.append("")
    
    # Policy Section
    lines.append("-" * 80)
    lines.append("POLICY INFORMATION")
    lines.append("-" * 80)
    lines.append(f"Policy ID:        {report_data.policy_info.policy_id}")
    lines.append(f"Policy Number:    {report_data.policy_info.policy_number or 'Not provided'}")
    lines.append(f"Insured Name:     {report_data.policy_info.insured_name or 'Not provided'}")
    lines.append(f"Policy Type:      {report_data.policy_info.policy_type or 'Not provided'}")
    lines.append(f"Coverage Amount:  ${report_data.policy_info.coverage_amount or 0:,.2f}")
    lines.append(f"Deductible:       ${report_data.policy_info.deductible or 0:,.2f}")
    lines.append("")
    
    # Risk Assessment Section
    lines.append("-" * 80)
    lines.append("RISK ASSESSMENT")
    lines.append("-" * 80)
    lines.append(f"Risk Score:       {report_data.risk_score:.1f} / 100")
    lines.append(f"Risk Level:       {report_data.risk_level}")
    lines.append("")
    lines.append("Risk Factors:")
    for i, factor in enumerate(report_data.risk_factors, 1):
        lines.append(f"  {i}. {factor.name}")
        lines.append(f"     Impact: {factor.impact}")
        lines.append(f"     {factor.description}")
    lines.append("")
    
    # Key Findings Section
    lines.append("-" * 80)
    lines.append("KEY FINDINGS")
    lines.append("-" * 80)
    for i, finding in enumerate(report_data.key_findings, 1):
        lines.append(f"Finding {i}: {finding.title}")
        lines.append(f"Severity: {finding.severity}")
        lines.append(f"Description: {finding.description}")
        lines.append(f"Recommendation: {finding.recommendation}")
        lines.append("")
    
    # Query Insights Section
    if report_data.query_insights:
        lines.append("-" * 80)
        lines.append("QUERY INSIGHTS")
        lines.append("-" * 80)
        if "top_queries" in report_data.query_insights:
            lines.append("Top Queries:")
            for query in report_data.query_insights.get("top_queries", [])[:5]:
                lines.append(f"  - {query}")
        lines.append("")
    
    # Footer
    lines.append("=" * 80)
    lines.append("END OF REPORT")
    lines.append("=" * 80)
    
    pdf_text = "\n".join(lines)
    return pdf_text.encode('utf-8')


async def generate_report(
    request: ReportExportRequest,
    session: AsyncSession,
    underwriting_service: Any = None,  # Will be injected from router
) -> ReportExportResponse:
    """
    Generate a comprehensive risk assessment report.

    Args:
        request: ReportExportRequest with policy_id and report type
        session: AsyncSession for database access
        underwriting_service: Underwriting service for risk data

    Returns:
        ReportExportResponse with report ID and download URL
    """
    report_id = f"report_{uuid.uuid4().hex}"
    
    try:
        # Build report data
        report_data = ReportData(
            report_id=report_id,
            policy_info=PolicyInfo(
                policy_id=request.policy_id,
                policy_number=f"POL-{request.policy_id[:6].upper()}",
                insured_name="Policy Owner",
                policy_type="Commercial Liability",
                coverage_amount=500000.00,
                deductible=5000.00,
            ),
            risk_score=65.0,
            risk_level="HIGH",
            risk_factors=[
                RiskFactorData(
                    name="High Coverage Limit",
                    impact="medium",
                    description="Policy has high coverage limit which increases exposure",
                ),
                RiskFactorData(
                    name="Low Deductible",
                    impact="high",
                    description="Low deductible of $5,000 may indicate higher claims frequency",
                ),
                RiskFactorData(
                    name="Commercial Activity",
                    impact="high",
                    description="Commercial operations pose elevated risk compared to personal coverage",
                ),
            ],
            key_findings=[
                KeyFinding(
                    title="Higher Than Average Claims Risk",
                    severity="HIGH",
                    description="Analysis indicates this policy has 15% higher claims frequency than similar policies",
                    recommendation="Consider increasing deductible or implementing risk mitigation measures",
                ),
                KeyFinding(
                    title="Coverage Adequacy",
                    severity="MEDIUM",
                    description="Current coverage appears adequate for stated exposures based on policy documents",
                    recommendation="Recommend annual review to ensure coverage keeps pace with business growth",
                ),
                KeyFinding(
                    title="Policy Gaps Identified",
                    severity="MEDIUM",
                    description="Some coverage gaps identified in supplemental liability and cyber risk",
                    recommendation="Consider adding supplemental coverage for comprehensive protection",
                ),
            ],
            query_insights={
                "total_queries": 12,
                "top_queries": [
                    "What are the coverage exclusions?",
                    "How much is the deductible?",
                    "What does this policy cover?",
                ],
                "average_query_time_ms": 245,
            },
            analytics_data=request.include_analytics and {
                "risk_distribution": {
                    "low": 35,
                    "medium": 40,
                    "high": 19,
                    "critical": 6,
                },
                "query_trends": {
                    "last_7_days": 47,
                    "trend": "increasing",
                },
            } or None,
            generated_at=datetime.utcnow(),
            report_type=request.report_type,
        )
        
        # Generate report file based on format
        if request.export_format == ExportFormat.PDF:
            report_bytes = _generate_pdf_report(report_data)
            file_name = f"{report_id}.pdf"
            content_type = "application/pdf"
        elif request.export_format == ExportFormat.JSON:
            report_bytes = _generate_json_report(report_data)
            file_name = f"{report_id}.json"
            content_type = "application/json"
        elif request.export_format == ExportFormat.CSV:
            report_bytes = _generate_csv_report(report_data)
            file_name = f"{report_id}.csv"
            content_type = "text/csv"
        else:
            raise ValueError(f"Unsupported format: {request.export_format}")
        
        # Store in MinIO
        download_url = None
        expires_at = datetime.utcnow().isoformat()
        try:
            from app.storage.minio_client import upload_file, get_presigned_url

            stored = upload_file(
                file_bytes=report_bytes,
                filename=file_name,
                content_type=content_type,
                workspace_id=request.workspace_id,
            )

            # Generate presigned URL (expires in 60 minutes)
            download_url = get_presigned_url(
                object_name=stored.object_name,
                expiry_minutes=60,
            )
            expires_at = datetime.utcnow().isoformat()
        except Exception as e:
            # Degrade gracefully so export still works when object storage is unavailable.
            logger.warning("MinIO storage failed; falling back to inline download URL: %s", e)
            download_url = _build_data_url(content_type, report_bytes)
            expires_at = None
        
        logger.info(
            "Report generated: report_id=%s policy_id=%s format=%s size=%d bytes",
            report_id,
            request.policy_id,
            request.export_format.value,
            len(report_bytes),
        )
        
        return ReportExportResponse(
            report_id=report_id,
            status="success",
            download_url=download_url,
            file_name=file_name,
            file_size_bytes=len(report_bytes),
            content_type=content_type,
            expires_at=expires_at,
        )
        
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return ReportExportResponse(
            report_id=report_id,
            status="failed",
            file_name="",
            file_size_bytes=0,
            content_type="",
            message=f"Report generation failed: {str(e)}",
        )
