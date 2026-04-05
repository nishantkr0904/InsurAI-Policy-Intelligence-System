"""
Workspace authorization dependencies and middleware.

Provides FastAPI dependencies for workspace access control:
  - extract_workspace_id: Gets workspace_id from request
  - validate_workspace_access: Checks user has access to workspace
  - require_workspace_admin: Requires admin role in workspace

Architecture ref:
  docs/system-architecture.md §11 – Multi-Tenant Architecture
"""

from __future__ import annotations

from typing import Optional, Tuple
from fastapi import Depends, HTTPException, Header, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import get_user_by_email
from app.auth.session import get_email_from_session_token
from app.core.config import settings
from app.database import get_db
from app.workspaces.service import WorkspaceService


async def get_workspace_id(
    workspace_id: Optional[str] = Query(None, description="Workspace ID"),
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-ID"),
) -> str:
    """
    Extract workspace_id from request.

    Priority:
      1. Query parameter: ?workspace_id=xxx
      2. Header: X-Workspace-ID: xxx
      3. Default: "default" (for backward compatibility)

    Returns:
        Workspace ID string
    """
    ws_id = workspace_id or x_workspace_id or "default"
    return ws_id


async def get_current_user_id(
    request: Request,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: AsyncSession = Depends(get_db),
) -> Optional[str]:
    """
    Extract user_id from request.

    In production, this would come from JWT token validation.
    For now, accepts X-User-ID header or returns None (anonymous).

    Returns:
        User ID string or None if not authenticated
    """
    # Header remains supported for internal/testing compatibility.
    if x_user_id:
        return x_user_id

    session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
    email = get_email_from_session_token(session_cookie)
    if not email:
        return None

    user = await get_user_by_email(db, email)
    return user.email if user else None


async def validate_workspace_access(
    workspace_id: str = Depends(get_workspace_id),
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Tuple[str, Optional[str]]:
    """
    Validate that user has access to the specified workspace.

    For public workspaces or when auth is disabled, allows access.
    For private workspaces, checks user membership.

    Args:
        workspace_id: Workspace ID from request
        user_id: User ID from authentication
        db: Database session

    Returns:
        Tuple of (workspace_id, user_role)

    Raises:
        HTTPException 403: If user doesn't have access
        HTTPException 404: If workspace doesn't exist
    """
    # For "default" workspace or when no auth, allow access (backward compatibility)
    if workspace_id == "default":
        return workspace_id, "admin"

    if not user_id:
        # Anonymous users can only access default workspace
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for non-default workspaces",
        )

    service = WorkspaceService(db)
    role = await service.check_user_access(workspace_id, user_id)

    if role is None:
        # Check if workspace exists
        workspace = await service.get_workspace_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace {workspace_id} not found",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to workspace {workspace_id}",
        )

    return workspace_id, role


async def require_workspace_admin(
    access: Tuple[str, Optional[str]] = Depends(validate_workspace_access),
) -> str:
    """
    Require admin role in workspace.

    Use this dependency for endpoints that modify workspace settings,
    manage members, or perform administrative actions.

    Args:
        access: Tuple of (workspace_id, role) from validate_workspace_access

    Returns:
        Workspace ID if user is admin

    Raises:
        HTTPException 403: If user is not an admin
    """
    workspace_id, role = access

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this action",
        )

    return workspace_id


async def require_workspace_member(
    access: Tuple[str, Optional[str]] = Depends(validate_workspace_access),
) -> str:
    """
    Require at least member role in workspace.

    Use this dependency for endpoints that create or modify content
    (upload documents, submit claims, etc.).

    Args:
        access: Tuple of (workspace_id, role) from validate_workspace_access

    Returns:
        Workspace ID if user is member or admin

    Raises:
        HTTPException 403: If user is viewer only
    """
    workspace_id, role = access

    if role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member access required for this action",
        )

    return workspace_id


class WorkspaceContext:
    """
    Context object holding workspace and user information.

    Provides convenient access to workspace context throughout request handling.
    """

    def __init__(self, workspace_id: str, user_id: Optional[str], role: Optional[str]):
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.role = role

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_member(self) -> bool:
        return self.role in ("admin", "member")

    @property
    def is_authenticated(self) -> bool:
        return self.user_id is not None


async def get_workspace_context(
    workspace_id: str = Depends(get_workspace_id),
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    """
    Get full workspace context for request.

    Returns WorkspaceContext with workspace_id, user_id, and role.
    Does not enforce access - use validate_workspace_access for that.

    Returns:
        WorkspaceContext object
    """
    role = None

    if workspace_id == "default":
        role = "admin"
    elif user_id:
        service = WorkspaceService(db)
        role = await service.check_user_access(workspace_id, user_id)

    return WorkspaceContext(workspace_id, user_id, role)
