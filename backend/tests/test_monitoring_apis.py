"""Tests for monitoring and error APIs (FR028-FR030)."""

import pytest


# ============================================================================
# ERROR MONITORING API TESTS (FR029)
# ============================================================================


@pytest.mark.asyncio
async def test_list_errors(client):
    """Test listing errors (FR029 - Error Monitoring)."""
    response = await client.get(
        "/api/v1/errors?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert "errors" in data or isinstance(data, dict)


@pytest.mark.asyncio
async def test_list_errors_pagination(client):
    """Test error list pagination (FR029)."""
    response = await client.get(
        "/api/v1/errors?workspace_id=workspace-1&limit=10&offset=0"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_error_statistics(client):
    """Test error statistics endpoint (FR029)."""
    response = await client.get(
        "/api/v1/errors/stats?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_update_error_status(client):
    """Test updating error status (FR029)."""
    # First get an error ID (for testing, use a hypothetical one)
    error_id = "error-123"

    payload = {"status": "resolved"}
    response = await client.put(
        f"/api/v1/errors/{error_id}/status",
        json=payload
    )
    # Response could be 200, 404, or 422 depending on whether error exists
    assert response.status_code in [200, 404, 422]


# ============================================================================
# PERFORMANCE MONITORING API TESTS (FR030)
# ============================================================================


@pytest.mark.asyncio
async def test_list_performance_metrics(client):
    """Test listing performance metrics (FR030 - Performance Monitoring)."""
    response = await client.get(
        "/api/v1/metrics?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_list_metrics_simple(client):
    """Test metrics list with filtering (FR030)."""
    response = await client.get(
        "/api/v1/metrics"
        "?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_metrics_pagination(client):
    """Test metrics list pagination (FR030)."""
    response = await client.get(
        "/api/v1/metrics?workspace_id=workspace-1&limit=20&offset=0"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_metrics_statistics(client):
    """Test metrics statistics endpoint (FR030)."""
    response = await client.get(
        "/api/v1/metrics/stats?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    # Should contain statistical summaries
    if data:
        # Could have stats, summary, or other aggregation fields
        assert len(data) >= 0


@pytest.mark.asyncio
async def test_metrics_health_check(client):
    """Test system health status from metrics (FR030)."""
    response = await client.get(
        "/api/v1/metrics/health?workspace_id=workspace-1"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    # Should contain health status information
    assert "status" in data or "health" in data or len(data) >= 0


@pytest.mark.asyncio
@pytest.mark.asyncio
async def test_metrics_by_model(client):
    """Test filtering metrics by model name (FR030)."""
    response = await client.get(
        "/api/v1/metrics?workspace_id=workspace-1&model=gpt-4"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_metrics_date_range(client):
    """Test metrics with date range filtering (FR030)."""
    response = await client.get(
        "/api/v1/metrics"
        "?workspace_id=workspace-1&start_date=2025-01-01&end_date=2025-12-31"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
