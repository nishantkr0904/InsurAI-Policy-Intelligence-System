"""Tests for workspace CRUD endpoints (FR024 - Workspace Isolation)."""

import pytest


@pytest.mark.asyncio
async def test_create_workspace(client):
    """Test creating a new workspace."""
    payload = {
        "slug": "test-workspace",
        "name": "Test Workspace",
        "organization": "Test Org",
        "owner_id": "user-123",
    }
    response = await client.post("/api/v1/workspaces", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "test-workspace"
    assert data["name"] == "Test Workspace"
    assert data["organization"] == "Test Org"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_workspaces(client):
    """Test listing all workspaces."""
    # Create two workspaces
    for i in range(2):
        payload = {
            "slug": f"workspace-{i}",
            "name": f"Workspace {i}",
            "organization": "Test Org",
            "owner_id": f"user-{i}",
        }
        await client.post("/api/v1/workspaces", json=payload)

    response = await client.get("/api/v1/workspaces")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data.get("workspaces"), list)
    assert len(data["workspaces"]) >= 2


@pytest.mark.asyncio
async def test_get_workspace(client):
    """Test retrieving a single workspace."""
    # Create a workspace
    payload = {
        "slug": "test-get-ws",
        "name": "Test Get Workspace",
        "organization": "Test Org",
        "owner_id": "user-123",
    }
    create_response = await client.post("/api/v1/workspaces", json=payload)
    id = create_response.json()["id"]

    # Get the workspace
    response = await client.get(f"/api/v1/workspaces/{id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == id
    assert data["slug"] == "test-get-ws"


@pytest.mark.asyncio
async def test_update_workspace(client):
    """Test updating a workspace."""
    # Create a workspace
    payload = {
        "slug": "test-update-ws",
        "name": "Test Update Workspace",
        "organization": "Test Org",
        "owner_id": "user-123",
    }
    create_response = await client.post("/api/v1/workspaces", json=payload)
    id = create_response.json()["id"]

    # Update the workspace
    update_payload = {
        "name": "Updated Workspace Name",
    }
    response = await client.patch(
        f"/api/v1/workspaces/{id}", json=update_payload
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Workspace Name"


@pytest.mark.asyncio
async def test_delete_workspace(client):
    """Test deleting a workspace."""
    # Create a workspace
    payload = {
        "slug": "test-delete-ws",
        "name": "Test Delete Workspace",
        "organization": "Test Org",
        "owner_id": "user-123",
    }
    create_response = await client.post("/api/v1/workspaces", json=payload)
    id = create_response.json()["id"]

    # Delete the workspace
    response = await client.delete(f"/api/v1/workspaces/{id}")
    assert response.status_code == 204

    # Verify it's deleted
    response = await client.get(f"/api/v1/workspaces/{id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_workspace_not_found(client):
    """Test retrieving a non-existent workspace."""
    response = await client.get("/api/v1/workspaces/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_workspace_slug(client):
    """Test creating a workspace with duplicate slug."""
    payload = {
        "slug": "duplicate-slug",
        "name": "First Workspace",
        "organization": "Test Org",
        "owner_id": "user-123",
    }
    response1 = await client.post("/api/v1/workspaces", json=payload)
    assert response1.status_code == 201

    # Try to create another with the same slug
    response2 = await client.post("/api/v1/workspaces", json=payload)
    assert response2.status_code in [409, 400]  # Conflict or Bad Request


@pytest.mark.asyncio
async def test_workspace_with_max_limits(client):
    """Test workspace creation with max document/storage limits."""
    payload = {
        "slug": "limits-workspace",
        "name": "Workspace with Limits",
        "organization": "Test Org",
        "owner_id": "user-123",
        "max_documents": 5000,
        "max_storage_bytes": 5368709120,  # 5GB
        "max_users": 25,
    }
    response = await client.post("/api/v1/workspaces", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["max_documents"] == 5000
    assert data["max_storage_bytes"] == 5368709120
    assert data["max_users"] == 25
