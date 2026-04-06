"""
Pydantic schemas for Notifications API.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    POLICY = "policy"
    RISK = "risk"
    CLAIM = "claim"
    COMPLIANCE = "compliance"
    FRAUD = "fraud"
    AUDIT = "audit"
    SYSTEM = "system"


class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationStatus(str, Enum):
    UNREAD = "unread"
    READ = "read"


class NotificationItem(BaseModel):
    id: str
    user_id: str
    role: str
    workspace_id: str
    type: NotificationType
    priority: NotificationPriority
    status: NotificationStatus
    title: str
    message: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    read_at: datetime | None = None


class NotificationsListResponse(BaseModel):
    notifications: list[NotificationItem]
    total: int
    unread_count: int
    limit: int
    offset: int
    has_more: bool


class MarkReadResponse(BaseModel):
    id: str
    status: NotificationStatus
    read_at: datetime | None


class MarkAllReadResponse(BaseModel):
    updated: int
    status: NotificationStatus = NotificationStatus.READ
