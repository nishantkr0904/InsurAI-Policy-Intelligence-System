"""
Document ingestion router.

Exposes the following endpoints:
  POST /api/v1/documents/upload
      Accepts a multipart PDF (or supported doc type), stores it in MinIO,
      records metadata in PostgreSQL (stub for now), and enqueues a
      Celery processing task.

  GET  /api/v1/documents/{document_id}          [stub – Phase P4]
  GET  /api/v1/documents/workspace/{ws_id}      [stub – Phase P4]

Architecture ref:
  docs/system-architecture.md §6 – Document Ingestion Pipeline
  docs/roadmap.md Phase 3 – "Implement FastAPI endpoint for file upload"
"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.ingestion.schemas import DocumentMetadata, DocumentStatus, DocumentUploadResponse
from app.storage.minio_client import list_documents, upload_file
from app.workers.ingestion_tasks import ingest_document

router = APIRouter(prefix="/api/v1/documents", tags=["Document Ingestion"])

# ---------------------------------------------------------------------------
# Allowed MIME types (guardrail: only process policy document formats)
# ---------------------------------------------------------------------------
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/msword",  # .doc
    "text/plain",
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.get(
    "",
    response_model=list[DocumentMetadata],
    summary="List documents in a workspace",
)
async def list_workspace_documents(
    workspace_id: str = Query(default="default", description="Workspace to list documents for."),
) -> list[DocumentMetadata]:
    """Return all documents stored under the given workspace, sourced from MinIO."""
    try:
        stored = list_documents(workspace_id=workspace_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Object storage unavailable: {exc}",
        ) from exc

    return [
        DocumentMetadata(
            document_id=obj.object_name.rsplit("/", 1)[-1].rsplit(".", 1)[0],
            filename=obj.object_name.rsplit("/", 1)[-1],
            size_bytes=obj.size_bytes,
            content_type=obj.content_type,
            workspace_id=workspace_id,
            status=DocumentStatus.INDEXED,
            object_key=obj.object_name,
            uploaded_at=datetime.utcnow(),
        )
        for obj in stored
    ]


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a policy document",
    description=(
        "Upload a PDF or Word document into the InsurAI ingestion pipeline. "
        "The file is stored in MinIO and a background parsing job is queued."
    ),
)
async def upload_document(
    file: Annotated[UploadFile, File(description="Policy document (PDF / DOCX / TXT).")],
    workspace_id: Annotated[
        str,
        Form(description="UUID of the workspace this document belongs to."),
    ] = "default",
) -> DocumentUploadResponse:
    """
    Step 1 of the ingestion pipeline:
      1. Validate file type and size.
      2. Read bytes into memory (max 50 MB).
      3. Upload to MinIO under the workspace prefix.
      4. Return a DocumentUploadResponse with status=PENDING.
      5. [Celery task enqueue will be wired in T4 worker sub-task.]
    """
    # --- Validation ---
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{content_type}'. "
                f"Allowed types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
            ),
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # --- Store in MinIO ---
    try:
        stored = upload_file(
            file_bytes=file_bytes,
            filename=file.filename or "upload.bin",
            content_type=content_type,
            workspace_id=workspace_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Object storage unavailable: {exc}",
        ) from exc

    # --- Dispatch async ingestion task ---
    document_id = uuid.uuid4().hex

    ingest_document.delay(
        document_id=document_id,
        object_key=stored.object_name,
        content_type=stored.content_type,
        workspace_id=workspace_id,
    )

    return DocumentUploadResponse(
        document_id=document_id,
        filename=file.filename or "upload.bin",
        size_bytes=stored.size_bytes,
        content_type=stored.content_type,
        workspace_id=workspace_id,
        status=DocumentStatus.PENDING,
        object_key=stored.object_name,
        uploaded_at=datetime.utcnow(),
    )
