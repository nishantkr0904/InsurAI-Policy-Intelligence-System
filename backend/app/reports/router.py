"""
Report generation API router (FR022).

Endpoints:
  - POST /api/v1/reports/export – Generate and download report
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.reports.schemas import (
    ReportExportRequest,
    ReportExportResponse,
)
from app.reports.service import generate_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/reports", tags=["Report Generation"])


@router.post(
    "/export",
    response_model=ReportExportResponse,
    summary="Generate and export report",
    description="Generate a risk assessment report in PDF, JSON, or CSV format",
)
async def export_report(
    request: ReportExportRequest,
    session: AsyncSession = Depends(get_db),
) -> ReportExportResponse:
    """
    Generate a comprehensive risk assessment report.

    Compiles:
      - Policy information
      - Risk assessment with score and factors
      - Key findings and recommendations
      - Query insights from audit trail
      - Optional analytics dashboard data

    Supports multiple export formats:
      - PDF: Professional formatted document
      - JSON: Structured data format
      - CSV: Spreadsheet-compatible format

    Returns presigned MinIO download URL (expires in 60 minutes).

    Request body:
      ```json
      {
        "policy_id": "policy_123",
        "report_type": "summary",
        "export_format": "pdf",
        "workspace_id": "workspace_abc",
        "include_analytics": false
      }
      ```

    Response:
      ```json
      {
        "report_id": "report_xyz",
        "status": "success",
        "download_url": "https://minio.../signed-url",
        "file_name": "report_xyz.pdf",
        "file_size_bytes": 45678,
        "content_type": "application/pdf",
        "expires_at": "2026-03-24T14:32:51Z"
      }
      ```

    Args:
        request: ReportExportRequest with generation parameters
        session: AsyncSession for database access

    Returns:
        ReportExportResponse with download URL and metadata

    Raises:
        HTTPException: 503 if report generation or storage fails
    """
    try:
        logger.info(
            "Generating report: policy_id=%s format=%s type=%s workspace=%s",
            request.policy_id,
            request.export_format.value,
            request.report_type.value,
            request.workspace_id,
        )

        response = await generate_report(request, session)

        if response.status == "failed":
            raise HTTPException(
                status_code=503,
                detail=response.message or "Report generation failed",
            )

        logger.info(
            "Report generated successfully: report_id=%s file_size=%d bytes",
            response.report_id,
            response.file_size_bytes,
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report export endpoint error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Report generation service unavailable",
        )
