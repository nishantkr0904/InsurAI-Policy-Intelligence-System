"""
Pydantic schemas for the document ingestion API.

Defines:
  - DocumentUploadResponse  – returned after a successful upload
  - DocumentStatus          – possible processing states
  - DocumentMetadata        – full document record returned on detail lookup

Architecture ref: docs/system-architecture.md §6 – Document Ingestion Pipeline
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    PENDING = "pending"       # Uploaded, queued for processing
    PROCESSING = "processing" # Celery worker actively parsing
    INDEXED = "indexed"       # Embedded and stored in Milvus
    FAILED = "failed"         # Parse or embed step failed


class DocumentUploadResponse(BaseModel):
    """Immediate response returned after a file is uploaded."""

    document_id: str = Field(..., description="UUID of the created document record.")
    filename: str = Field(..., description="Original filename as submitted.")
    size_bytes: int = Field(..., description="File size in bytes.")
    content_type: str = Field(..., description="MIME type of the uploaded file.")
    workspace_id: str = Field(..., description="Workspace this document belongs to.")
    status: DocumentStatus = Field(
        default=DocumentStatus.PENDING,
        description="Initial processing status.",
    )
    object_key: str = Field(..., description="MinIO object path (bucket-scoped key).")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class DocumentMetadata(BaseModel):
    """Full document record, returned on detail/list endpoints."""

    document_id: str
    filename: str
    size_bytes: int
    content_type: str
    workspace_id: str
    status: DocumentStatus
    object_key: str
    uploaded_by: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    chunk_count: Optional[int] = None
    error_message: Optional[str] = None

    class Config:
        use_enum_values = True
