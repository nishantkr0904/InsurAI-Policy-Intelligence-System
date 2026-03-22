"""Tests for domain-specific APIs (claims, fraud, compliance, audit)."""

from unittest.mock import MagicMock, patch

import pytest


# ============================================================================
# CLAIMS API TESTS (FR013-FR014)
# ============================================================================


@pytest.mark.asyncio
async def test_claim_validation_success(client):
    """Test successful claim validation (FR013 - Claim Policy Validation)."""
    payload = {
        "claim_id": "CLM-001",
        "policy_id": "POL-123",
        "claim_type": "health",
        "claim_amount": 5000,
        "description": "Medical expenses for hospitalization",
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
async def test_claim_validation_with_rag(client):
    """Test claim validation with RAG retrieval (FR013-FR014)."""
    payload = {
        "claim_id": "CLM-002",
        "policy_id": "POL-456",
        "claim_type": "auto",
        "claim_amount": 15000,
        "description": "Vehicle damage from accident",
        "workspace_id": "workspace-1",
    }

    with patch("app.claims.router.retrieve") as mock_retrieve, \
         patch("app.claims.router.synthesize") as mock_synthesize:

        mock_retrieve.return_value = [
            MagicMock(content="Auto insurance covers collision damage")
        ]

        mock_synthesize.return_value = MagicMock(
            answer="Claim approved - collision coverage applies",
            sources=[],
            token_usage={"input": 100, "output": 30},
        )

        response = await client.post("/api/v1/claims/validate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "approval_status" in data


@pytest.mark.asyncio
async def test_claim_validation_unsupported_type(client):
    """Test claim validation with unsupported claim type."""
    payload = {
        "claim_id": "CLM-003",
        "policy_id": "POL-789",
        "claim_type": "invalid_type",
        "claim_amount": 5000,
        "description": "Some claim",
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
    assert "stats" in data


@pytest.mark.asyncio
async def test_fraud_alerts_filtering(client):
    """Test fraud alerts with filtering (FR016-FR017)."""
    response = await client.get(
        "/api/v1/fraud/alerts"
        "?workspace_id=workspace-1&status=NEW&severity=high&min_risk_score=0.7"
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
    # Verify investigation data structure in alerts
    if data.get("alerts"):
        alert = data["alerts"][0]
        # Check for investigation support fields
        assert "alert_id" in alert or "fraud_alert_id" in alert


# ============================================================================
# COMPLIANCE API TESTS (FR019-FR020)
# ============================================================================


@pytest.mark.asyncio
async def test_compliance_issues_list(client):
    """Test listing compliance issues (FR019 - Compliance Review)."""
    response = await client.get(
        "/api/v1/compliance/issues?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert "issues" in data
    assert "total" in data
    assert "stats" in data


@pytest.mark.asyncio
async def test_compliance_issues_filtering(client):
    """Test compliance issues with filtering (FR019)."""
    response = await client.get(
        "/api/v1/compliance/issues"
        "?workspace_id=workspace-1&status=open&severity=critical&rule_category=data_privacy"
    )
    assert response.status_code == 200
    data = response.json()
    assert "issues" in data


@pytest.mark.asyncio
async def test_compliance_report_generation(client):
    """Test compliance report generation (FR020 - Compliance Report Generation)."""
    payload = {
        "workspace_id": "workspace-1",
    }

    response = await client.post("/api/v1/compliance/report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "compliance_score" in data or "score" in data
    assert "summary" in data or "executive_summary" in data
    assert "issues" in data or "breakdown" in data


@pytest.mark.asyncio
async def test_compliance_report_with_filters(client):
    """Test compliance report with date filters (FR020)."""
    payload = {
        "workspace_id": "workspace-1",
        "start_date": "2025-01-01",
        "end_date": "2025-12-31",
    }

    response = await client.post("/api/v1/compliance/report", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Verify report structure
    assert isinstance(data, dict)


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
    assert "logs" in data or "audit_logs" in data
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
    assert "logs" in data or "audit_logs" in data


@pytest.mark.asyncio
async def test_audit_logs_date_range(client):
    """Test audit logs with date range filtering (FR021)."""
    response = await client.get(
        "/api/v1/audit"
        "?workspace_id=workspace-1&start_date=2025-01-01&end_date=2025-12-31"
    )
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data or "audit_logs" in data


@pytest.mark.asyncio
async def test_audit_analytics(client):
    """Test audit analytics endpoint (FR021)."""
    response = await client.get(
        "/api/v1/audit/analytics?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    # Verify analytics structure
    assert isinstance(data, dict)
    # Should contain aggregated statistics
    assert "stats" in data or "summary" in data or "top_actions" in data


@pytest.mark.asyncio
async def test_audit_logs_pagination(client):
    """Test audit logs pagination (FR021)."""
    response = await client.get(
        "/api/v1/audit?workspace_id=workspace-1&limit=20&offset=0"
    )
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data or "audit_logs" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
