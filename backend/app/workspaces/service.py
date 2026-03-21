"""
Workspace service layer.

Business logic for workspace CRUD operations, member management, and access control.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Workspace, Document, AuditLog, FraudAlert, ComplianceIssue, ClaimValidation
from app.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceMemberAdd,
    WorkspaceResponse,
    WorkspaceStatsResponse,
)


class WorkspaceService:
    """
    Service class for workspace management operations.

    Handles:
      - CRUD operations for workspaces
      - Member management (add/remove users)
      - Access control validation
      - Resource usage statistics
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_workspace(self, workspace_data: WorkspaceCreate) -> Workspace:
        """
        Create a new workspace (tenant).

        Args:
            workspace_data: Workspace creation data

        Returns:
            Created Workspace instance

        Raises:
            ValueError: If slug already exists
        """
        # Check if slug already exists
        stmt = select(Workspace).where(Workspace.slug == workspace_data.slug)
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            raise ValueError(f"Workspace with slug '{workspace_data.slug}' already exists")

        # Create workspace
        workspace = Workspace(
            slug=workspace_data.slug,
            name=workspace_data.name,
            organization=workspace_data.organization,
            owner_id=workspace_data.owner_id,
            members=[
                {
                    "user_id": workspace_data.owner_id,
                    "role": "admin",
                    "joined_at": datetime.utcnow().isoformat(),
                }
            ],  # Owner is automatically admin
            settings={},
            max_documents=workspace_data.max_documents,
            max_storage_bytes=workspace_data.max_storage_bytes,
            max_users=workspace_data.max_users,
            is_active=True,
        )

        self.db.add(workspace)
        await self.db.commit()
        await self.db.refresh(workspace)

        return workspace

    async def get_workspace_by_id(self, workspace_id: str) -> Optional[Workspace]:
        """Get workspace by ID."""
        stmt = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_workspace_by_slug(self, slug: str) -> Optional[Workspace]:
        """Get workspace by slug."""
        stmt = select(Workspace).where(
            Workspace.slug == slug,
            Workspace.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_workspaces(
        self,
        owner_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[List[Workspace], int]:
        """
        List workspaces with optional filtering.

        Args:
            owner_id: Filter by owner (optional)
            limit: Maximum results
            offset: Pagination offset

        Returns:
            Tuple of (workspaces, total_count)
        """
        # Build query
        stmt = select(Workspace).where(Workspace.deleted_at.is_(None))

        if owner_id:
            stmt = stmt.where(Workspace.owner_id == owner_id)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        # Get paginated results
        stmt = stmt.order_by(Workspace.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        workspaces = result.scalars().all()

        return list(workspaces), total

    async def update_workspace(
        self,
        workspace_id: str,
        update_data: WorkspaceUpdate,
    ) -> Optional[Workspace]:
        """
        Update workspace information.

        Args:
            workspace_id: Workspace ID to update
            update_data: Fields to update

        Returns:
            Updated Workspace or None if not found
        """
        workspace = await self.get_workspace_by_id(workspace_id)
        if not workspace:
            return None

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(workspace, key, value)

        workspace.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(workspace)

        return workspace

    async def delete_workspace(self, workspace_id: str) -> bool:
        """
        Soft delete a workspace.

        Args:
            workspace_id: Workspace ID to delete

        Returns:
            True if deleted, False if not found
        """
        workspace = await self.get_workspace_by_id(workspace_id)
        if not workspace:
            return False

        workspace.deleted_at = datetime.utcnow()
        workspace.is_active = False

        await self.db.commit()
        return True

    async def add_member(
        self,
        workspace_id: str,
        member_data: WorkspaceMemberAdd,
    ) -> Optional[Workspace]:
        """
        Add a member to workspace.

        Args:
            workspace_id: Workspace ID
            member_data: Member info (user_id, role)

        Returns:
            Updated Workspace or None if not found
        """
        workspace = await self.get_workspace_by_id(workspace_id)
        if not workspace:
            return None

        # Check if user already member
        existing_member = next(
            (m for m in workspace.members if m["user_id"] == member_data.user_id),
            None,
        )

        if existing_member:
            # Update role if already member
            existing_member["role"] = member_data.role
        else:
            # Add new member
            workspace.members.append(
                {
                    "user_id": member_data.user_id,
                    "role": member_data.role,
                    "joined_at": datetime.utcnow().isoformat(),
                }
            )

        # Mark as modified (SQLAlchemy doesn't auto-detect JSON changes)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(workspace, "members")

        workspace.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(workspace)

        return workspace

    async def remove_member(
        self,
        workspace_id: str,
        user_id: str,
    ) -> Optional[Workspace]:
        """
        Remove a member from workspace.

        Args:
            workspace_id: Workspace ID
            user_id: User ID to remove

        Returns:
            Updated Workspace or None if not found

        Raises:
            ValueError: If trying to remove workspace owner
        """
        workspace = await self.get_workspace_by_id(workspace_id)
        if not workspace:
            return None

        # Cannot remove owner
        if workspace.owner_id == user_id:
            raise ValueError("Cannot remove workspace owner")

        # Remove member
        workspace.members = [m for m in workspace.members if m["user_id"] != user_id]

        # Mark as modified
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(workspace, "members")

        workspace.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(workspace)

        return workspace

    async def check_user_access(
        self,
        workspace_id: str,
        user_id: str,
    ) -> Optional[str]:
        """
        Check if user has access to workspace.

        Args:
            workspace_id: Workspace ID
            user_id: User ID

        Returns:
            User role (admin, member, viewer) or None if no access
        """
        workspace = await self.get_workspace_by_id(workspace_id)
        if not workspace or not workspace.is_active:
            return None

        # Check if user is owner
        if workspace.owner_id == user_id:
            return "admin"

        # Check if user is member
        member = next(
            (m for m in workspace.members if m["user_id"] == user_id),
            None,
        )

        return member["role"] if member else None

    async def get_workspace_stats(self, workspace_id: str) -> Optional[WorkspaceStatsResponse]:
        """
        Get workspace resource usage statistics.

        Args:
            workspace_id: Workspace ID

        Returns:
            WorkspaceStatsResponse with usage stats
        """
        workspace = await self.get_workspace_by_id(workspace_id)
        if not workspace:
            return None

        # Count documents
        doc_count_stmt = select(func.count()).select_from(Document).where(
            Document.workspace_id == workspace_id,
            Document.deleted_at.is_(None),
        )
        doc_count_result = await self.db.execute(doc_count_stmt)
        document_count = doc_count_result.scalar_one()

        # Calculate storage used
        storage_stmt = select(func.sum(Document.size_bytes)).where(
            Document.workspace_id == workspace_id,
            Document.deleted_at.is_(None),
        )
        storage_result = await self.db.execute(storage_stmt)
        storage_used = storage_result.scalar_one() or 0

        # Count users
        user_count = len(workspace.members)

        return WorkspaceStatsResponse(
            workspace_id=workspace_id,
            document_count=document_count,
            storage_used_bytes=storage_used,
            user_count=user_count,
            created_at=workspace.created_at,
        )
