"""
Workspace management API endpoints.

Provides REST API for workspace CRUD operations.

Routes:
  - POST /api/v1/workspaces - Create workspace
  - GET /api/v1/workspaces - List workspaces
  - GET /api/v1/workspaces/{workspace_id} - Get workspace details
  - PATCH /api/v1/workspaces/{workspace_id} - Update workspace
  - DELETE /api/v1/workspaces/{workspace_id} - Delete workspace (soft)
  - POST /api/v1/workspaces/{workspace_id}/members - Add member
  - DELETE /api/v1/workspaces/{workspace_id}/members/{user_id} - Remove member
  - GET /api/v1/workspaces/{workspace_id}/stats - Get usage stats
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.workspaces.service import WorkspaceService
from app.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceMemberAdd,
    WorkspaceResponse,
    WorkspaceListResponse,
    WorkspaceStatsResponse,
)

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new workspace (tenant).

    Creates a workspace with the owner as the first admin member.

    **Request body:**
    ```json
    {
      "slug": "acme-insurance",
      "name": "ACME Insurance Co.",
      "organization": "ACME Corp",
      "owner_id": "user_123",
      "max_documents": 10000,
      "max_storage_bytes": 10737418240,
      "max_users": 50
    }
    ```

    **Response:**
    Returns the created workspace with all fields.
    """
    service = WorkspaceService(db)

    try:
        workspace = await service.create_workspace(workspace_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return workspace


@router.get("", response_model=WorkspaceListResponse)
async def list_workspaces(
    owner_id: Optional[str] = Query(None, description="Filter by owner user ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
):
    """
    List workspaces.

    Returns paginated list of workspaces, optionally filtered by owner.

    **Query parameters:**
    - `owner_id`: Filter by owner user ID (optional)
    - `limit`: Max results (1-1000, default 100)
    - `offset`: Pagination offset (default 0)

    **Response:**
    ```json
    {
      "workspaces": [...],
      "total": 25,
      "limit": 100,
      "offset": 0
    }
    ```
    """
    service = WorkspaceService(db)
    workspaces, total = await service.list_workspaces(
        owner_id=owner_id,
        limit=limit,
        offset=offset,
    )

    return WorkspaceListResponse(
        workspaces=workspaces,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get workspace details by ID.

    Returns full workspace information including members and settings.

    **Path parameters:**
    - `workspace_id`: Workspace UUID

    **Response:**
    Full workspace object with all fields.
    """
    service = WorkspaceService(db)
    workspace = await service.get_workspace_by_id(workspace_id)

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} not found",
        )

    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    update_data: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update workspace information.

    Updates any combination of workspace fields.
    Only provided fields are updated.

    **Path parameters:**
    - `workspace_id`: Workspace UUID

    **Request body (all optional):**
    ```json
    {
      "name": "New Name",
      "organization": "New Org",
      "settings": {...},
      "max_documents": 20000,
      "is_active": true
    }
    ```

    **Response:**
    Updated workspace object.
    """
    service = WorkspaceService(db)
    workspace = await service.update_workspace(workspace_id, update_data)

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} not found",
        )

    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete workspace (soft delete).

    Marks workspace as deleted. Data remains in database for recovery.

    **Path parameters:**
    - `workspace_id`: Workspace UUID

    **Response:**
    204 No Content on success.
    """
    service = WorkspaceService(db)
    deleted = await service.delete_workspace(workspace_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} not found",
        )


# ============================================================================
# MEMBER MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/{workspace_id}/members", response_model=WorkspaceResponse)
async def add_workspace_member(
    workspace_id: str,
    member_data: WorkspaceMemberAdd,
    db: AsyncSession = Depends(get_db),
):
    """
    Add a member to workspace.

    Adds a user to the workspace with specified role.
    If user already a member, updates their role.

    **Path parameters:**
    - `workspace_id`: Workspace UUID

    **Request body:**
    ```json
    {
      "user_id": "user_456",
      "role": "member"
    }
    ```

    **Roles:**
    - `admin`: Full access, can manage workspace
    - `member`: Can create/edit content
    - `viewer`: Read-only access

    **Response:**
    Updated workspace object with new member.
    """
    service = WorkspaceService(db)
    workspace = await service.add_member(workspace_id, member_data)

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} not found",
        )

    return workspace


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_workspace_member(
    workspace_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a member from workspace.

    Removes user from workspace members list.
    Cannot remove workspace owner.

    **Path parameters:**
    - `workspace_id`: Workspace UUID
    - `user_id`: User ID to remove

    **Response:**
    204 No Content on success.
    """
    service = WorkspaceService(db)

    try:
        workspace = await service.remove_member(workspace_id, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} not found",
        )


# ============================================================================
# STATS ENDPOINTS
# ============================================================================

@router.get("/{workspace_id}/stats", response_model=WorkspaceStatsResponse)
async def get_workspace_stats(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get workspace resource usage statistics.

    Returns current usage metrics for documents, storage, and users.

    **Path parameters:**
    - `workspace_id`: Workspace UUID

    **Response:**
    ```json
    {
      "workspace_id": "...",
      "document_count": 237,
      "storage_used_bytes": 1048576000,
      "user_count": 12,
      "created_at": "2026-03-20T10:30:00Z"
    }
    ```
    """
    service = WorkspaceService(db)
    stats = await service.get_workspace_stats(workspace_id)

    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} not found",
        )

    return stats
