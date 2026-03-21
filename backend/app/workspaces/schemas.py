"""
Pydantic schemas for workspace management endpoints.

Request/response models for workspace CRUD operations.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# WORKSPACE MEMBER SCHEMA
# ============================================================================

class WorkspaceMember(BaseModel):
    """Member of a workspace with role assignment."""

    user_id: str = Field(..., description="User ID")
    role: str = Field(..., description="User role (admin, member, viewer)")
    joined_at: datetime = Field(..., description="When user joined workspace")


# ============================================================================
# WORKSPACE SETTINGS SCHEMA
# ============================================================================

class WorkspaceSettings(BaseModel):
    """Workspace configuration settings."""

    default_retention_days: int = Field(90, description="Default data retention period")
    allow_public_sharing:

 bool = Field(False, description="Allow public document sharing")
    require_mfa: bool = Field(False, description="Require multi-factor authentication")
    timezone: str = Field("UTC", description="Default timezone")


# ============================================================================
# WORKSPACE REQUEST SCHEMAS
# ============================================================================

class WorkspaceCreate(BaseModel):
    """Request schema for creating a new workspace."""

    slug: str = Field(..., min_length=3, max_length=64, description="URL-safe workspace identifier")
    name: str = Field(..., min_length=1, max_length=255, description="Display name")
    organization: Optional[str] = Field(None, max_length=255, description="Legal entity name")
    owner_id: str = Field(..., description="User ID of workspace owner")
    max_documents: Optional[int] = Field(10000, description="Maximum documents allowed")
    max_storage_bytes: Optional[int] = Field(10737418240, description="Maximum storage in bytes (default 10GB)")
    max_users: Optional[int] = Field(50, description="Maximum users allowed")

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        """Ensure slug is URL-safe (alphanumeric, hyphens, underscores only)."""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Slug must contain only alphanumeric characters, hyphens, and underscores")
        return v.lower()


class WorkspaceUpdate(BaseModel):
    """Request schema for updating an existing workspace."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Display name")
    organization: Optional[str] = Field(None, max_length=255, description="Organization name")
    settings: Optional[Dict[str, Any]] = Field(None, description="Workspace settings")
    max_documents: Optional[int] = Field(None, description="Maximum documents allowed")
    max_storage_bytes: Optional[int] = Field(None, description="Maximum storage in bytes")
    max_users: Optional[int] = Field(None, description="Maximum users allowed")
    is_active: Optional[bool] = Field(None, description="Workspace active status")


class WorkspaceMemberAdd(BaseModel):
    """Request schema for adding a member to workspace."""

    user_id: str = Field(..., description="User ID to add")
    role: str = Field("member", description="Role (admin, member, viewer)")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Ensure role is valid."""
        allowed_roles = {"admin", "member", "viewer"}
        if v not in allowed_roles:
            raise ValueError(f"Role must be one of: {', '.join(allowed_roles)}")
        return v


# ============================================================================
# WORKSPACE RESPONSE SCHEMAS
# ============================================================================

class WorkspaceResponse(BaseModel):
    """Response schema for workspace data."""

    id: str
    slug: str
    name: str
    organization: Optional[str]
    owner_id: str
    members: List[Dict[str, Any]]  # Simplified for now, can use WorkspaceMember later
    settings: Dict[str, Any]
    max_documents: Optional[int]
    max_storage_bytes: Optional[int]
    max_users: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkspaceListResponse(BaseModel):
    """Response schema for listing workspaces."""

    workspaces: List[WorkspaceResponse]
    total: int
    limit: int
    offset: int


class WorkspaceStatsResponse(BaseModel):
    """Response schema for workspace statistics."""

    workspace_id: str
    document_count: int
    storage_used_bytes: int
    user_count: int
    created_at: datetime
