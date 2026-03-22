"""Tests for domain-specific APIs (claims, fraud, compliance, audit)."""

from unittest.mock import MagicMock, patch

import pytest


# ============================================================================
# CLAIMS API TESTS (FR013-FR014)
# ============================================================================


@pytest.mark.asyncio
async def test_claim_validation_success(client):
    """Test successful claim validation (FR013 - Claim Policy Validation)."""
    # Mock the RAG retrieve function and litellm completion
    with patch("app.claims.service.retrieve") as mock_retrieve, \
         patch("app.claims.service.litellm.completion") as mock_llm:

        mock_retrieve.return_value = [
            MagicMock(
                text="Health insurance covers hospital expenses up to $500,000",
                document_id="doc-1",
                chunk_index=1,
            )
        ]

        # Mock LLM response
        mock_llm.return_value = MagicMock(
            choices=[MagicMock(
                message=MagicMock(
                    content='{"approval_status": "approved", "risk_score": 25, "severity": "low", "reasoning": "Claim approved based on policy coverage", "confidence_score": 85, "clause_violations": [], "next_steps": ["Process payment"]}'
                )
            )],
            usage=MagicMock(prompt_tokens=100, completion_tokens=50),
        )

        payload = {
            "claim_id": "CLM-001",
            "policy_number": "POL-123",  # Correct field name
            "claim_type": "health",
            "claim_amount": 5000,
            "description": "Medical expenses for hospitalization during treatment",
            "workspace_id": "workspace-1",
        }

        response = await client.post("/api/v1/claims/validate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "approval_status" in data
        assert "risk_score" in data
        assert "reasoning" in data
        assert "referenced_clauses" in data


@pytest.mark.asyncio
async def test_claim_validation_auto_claim(client):
    """Test claim validation for auto insurance (FR013-FR014)."""
    with patch("app.claims.service.retrieve") as mock_retrieve, \
         patch("app.claims.service.litellm.completion") as mock_llm:

        mock_retrieve.return_value = [
            MagicMock(
                text="Auto insurance covers collision damage",
                document_id="doc-1",
                chunk_index=1,
            )
        ]

        # Mock LLM response
        mock_llm.return_value = MagicMock(
            choices=[MagicMock(
                message=MagicMock(
                    content='{"approval_status": "approved", "risk_score": 35, "severity": "low", "reasoning": "Claim approved - collision coverage applies", "confidence_score": 90, "clause_violations": [], "next_steps": ["Arrange inspection"]}'
                )
            )],
            usage=MagicMock(prompt_tokens=100, completion_tokens=30),
        )

        payload = {
            "claim_id": "CLM-002",
            "policy_number": "POL-456",  # Correct field name
            "claim_type": "auto",
            "claim_amount": 15000,
            "description": "Vehicle damage from highway accident collision",
            "workspace_id": "workspace-1",
        }

        response = await client.post("/api/v1/claims/validate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "approval_status" in data


@pytest.mark.asyncio
async def test_claim_validation_unsupported_type(client):
    """Test claim validation with unsupported claim type."""
    payload = {
        "claim_id": "CLM-003",
        "policy_number": "POL-789",  # Correct field name
        "claim_type": "invalid_type",
        "claim_amount": 5000,
        "description": "Some claim description that is long enough",
        "workspace_id": "workspace-1",
    }

    response = await client.post("/api/v1/claims/validate", json=payload)
    assert response.status_code in [400, 422]  # Validation error


# ============================================================================
# FRAUD DETECTION API TESTS (FR016-FR018)
# ============================================================================


@pytest.mark.asyncio
async def test_fraud_alerts_list(client):
    """Test listing fraud alerts (FR016 - Fraud Pattern Detection)."""
    response = await client.get(
        "/api/v1/fraud/alerts?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data


@pytest.mark.asyncio
async def test_fraud_alerts_filtering(client):
    """Test fraud alerts with filtering (FR016-FR017)."""
    response = await client.get(
        "/api/v1/fraud/alerts"
        "?workspace_id=workspace-1&status=new&severity=high&min_risk_score=0.7"
    )
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data


@pytest.mark.asyncio
async def test_fraud_alerts_pagination(client):
    """Test fraud alerts pagination (FR016)."""
    response = await client.get(
        "/api/v1/fraud/alerts?workspace_id=workspace-1&limit=10&offset=0"
    )
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data


@pytest.mark.asyncio
async def test_fraud_investigation_support(client):
    """Test fraud investigation support (FR018 - Fraud Investigation Support)."""
    response = await client.get(
        "/api/v1/fraud/alerts?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    # Verify fraud alerts structure
    assert "alerts" in data
    if data.get("alerts"):
        alert = data["alerts"][0]
        # Check for fraud alert fields
        assert "alert_id" in alert
        assert "risk_score" in alert


# ============================================================================
# COMPLIANCE API TESTS (FR019-FR020)
# ============================================================================


@pytest.mark.asyncio
async def test_compliance_issues_list(client):
    """Test listing compliance issues (FR019 - Compliance Review)."""
    # Mock the compliance service
    from app.compliance.schemas import ComplianceIssuesResponse

    mock_response = ComplianceIssuesResponse(
        issues=[],
        total=0,
        limit=50,
        offset=0,
        has_more=False,
        summary={"total_count": 0, "by_severity": {}, "by_status": {}, "by_category": {}},
    )

    with patch("app.compliance.router.get_compliance_issues", return_value=mock_response):
        response = await client.get(
            "/api/v1/compliance/issues?workspace_id=workspace-1"
        )
        assert response.status_code == 200
        data = response.json()
        assert "issues" in data
        assert "total" in data
        assert "summary" in data


@pytest.mark.asyncio
async def test_compliance_issues_filtering(client):
    """Test compliance issues with filtering (FR019)."""
    from app.compliance.schemas import ComplianceIssuesResponse

    mock_response = ComplianceIssuesResponse(
        issues=[],
        total=0,
        limit=50,
        offset=0,
        has_more=False,
        summary={},
    )

    with patch("app.compliance.router.get_compliance_issues", return_value=mock_response):
        response = await client.get(
            "/api/v1/compliance/issues"
            "?workspace_id=workspace-1&status_filter=open&severity_filter=critical&category_filter=data_privacy"
        )
        assert response.status_code == 200
        data = response.json()
        assert "issues" in data


@pytest.mark.asyncio
async def test_compliance_report_generation(client):
    """Test compliance report generation (FR020 - Compliance Report Generation)."""
    from app.compliance.schemas import ComplianceReport, ExecutiveSummary

    mock_response = ComplianceReport(
        report_id="rpt-123",
        workspace_id="workspace-1",
        generated_date="2026-03-23T00:00:00Z",
        compliance_score=85.0,
        executive_summary=ExecutiveSummary(
            compliance_score=85.0,
            total_issues=10,
            critical_count=1,
            high_count=2,
            medium_count=4,
            low_count=3,
            remediation_rate=60.0,
            last_audit_date="2026-03-22T00:00:00Z",
        ),
        category_breakdown=[],
        top_issues=[],
        recommendations=[],
        detailed_issues=[],
    )

    with patch("app.compliance.router.generate_compliance_report", return_value=mock_response):
        response = await client.get(
            "/api/v1/compliance/report?workspace_id=workspace-1"
        )
        assert response.status_code == 200
        data = response.json()
        assert "executive_summary" in data
        assert "compliance_score" in data["executive_summary"]
        assert "category_breakdown" in data


@pytest.mark.asyncio
async def test_compliance_report_with_date_range(client):
    """Test compliance report with date range (FR020)."""
    from app.compliance.schemas import ComplianceReport, ExecutiveSummary

    mock_response = ComplianceReport(
        report_id="rpt-456",
        workspace_id="workspace-1",
        generated_date="2026-03-23T00:00:00Z",
        compliance_score=90.0,
        executive_summary=ExecutiveSummary(
            compliance_score=90.0,
            total_issues=5,
            critical_count=0,
            high_count=1,
            medium_count=2,
            low_count=2,
            remediation_rate=75.0,
            last_audit_date="2026-03-22T00:00:00Z",
        ),
        category_breakdown=[],
        top_issues=[],
        recommendations=[],
        detailed_issues=[],
    )

    with patch("app.compliance.router.generate_compliance_report", return_value=mock_response):
        response = await client.get(
            "/api/v1/compliance/report"
            "?workspace_id=workspace-1&start_date=2025-01-01&end_date=2025-12-31"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "executive_summary" in data
        assert "compliance_score" in data["executive_summary"]


# ============================================================================
# AUDIT LOGGING API TESTS (FR021)
# ============================================================================


@pytest.mark.asyncio
async def test_audit_logs_list(client):
    """Test listing audit logs (FR021 - Audit Policy History)."""
    response = await client.get(
        "/api/v1/audit?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_audit_logs_filtering(client):
    """Test audit logs with filtering (FR021)."""
    response = await client.get(
        "/api/v1/audit"
        "?workspace_id=workspace-1&action=document_view&user_id=user-123"
    )
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data


@pytest.mark.asyncio
async def test_audit_logs_date_range(client):
    """Test audit logs with date range filtering (FR021)."""
    response = await client.get(
        "/api/v1/audit"
        "?workspace_id=workspace-1&start_date=2025-01-01&end_date=2025-12-31"
    )
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data


@pytest.mark.asyncio
async def test_audit_analytics(client):
    """Test audit analytics endpoint (FR021)."""
    from app.audit.schemas import AuditAnalytics

    mock_response = AuditAnalytics(
        workspace_id="workspace-1",
        total_events=100,
        success_rate=95.0,
        top_actions=[],
        most_active_users=[],
        error_count=5,
        critical_count=1,
        avg_response_time_ms=150.0,
        period_start="2025-01-01T00:00:00Z",
        period_end="2025-12-31T23:59:59Z",
    )

    with patch("app.audit.router.get_audit_analytics", return_value=mock_response):
        response = await client.get(
            "/api/v1/audit/analytics?workspace_id=workspace-1"
        )
        assert response.status_code == 200
        data = response.json()
        # Verify analytics structure
        assert isinstance(data, dict)
        # Should contain aggregated statistics
        assert "top_actions" in data or "most_active_users" in data or "total_events" in data


@pytest.mark.asyncio
async def test_audit_logs_pagination(client):
    """Test audit logs pagination (FR021)."""
    response = await client.get(
        "/api/v1/audit?workspace_id=workspace-1&limit=20&offset=0"
    )
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
