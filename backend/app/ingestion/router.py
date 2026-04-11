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
import logging
import re
from datetime import datetime
from typing import Annotated

from sqlalchemy import select
from fastapi import APIRouter, File, Form, Header, HTTPException, Query, Request, UploadFile, status

from app.database import AsyncSessionLocal
from app.ingestion.schemas import DocumentMetadata, DocumentStatus, DocumentUploadResponse
from app.models import Document, Policy
from app.notifications.schemas import NotificationPriority, NotificationType
from app.notifications.service import dispatch_notification_for_actor
from app.storage.minio_client import list_documents, upload_file, delete_file
from app.workers.ingestion_tasks import ingest_document

router = APIRouter(prefix="/api/v1/documents", tags=["Document Ingestion"])
logger = logging.getLogger(__name__)

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

_POLICY_ID_PATTERN = re.compile(r"(POL-[A-Z0-9\-]+)", re.IGNORECASE)


def _infer_policy_type(filename: str) -> str:
    lower = filename.lower()
    if "auto" in lower or "vehicle" in lower or "motor" in lower:
        return "auto"
    if "health" in lower or "medical" in lower:
        return "health"
    if "home" in lower or "property" in lower:
        return "property"
    if "liability" in lower:
        return "liability"
    if "life" in lower:
        return "life"
    return "general"


def _derive_policy_id(filename: str) -> str:
    match = _POLICY_ID_PATTERN.search(filename)
    if match:
        return match.group(1).upper()
    return f"POL-{uuid.uuid4().hex[:8].upper()}"


def _document_to_metadata(document: Document) -> DocumentMetadata:
    return DocumentMetadata(
        document_id=document.id,
        filename=document.filename,
        size_bytes=document.size_bytes,
        content_type=document.content_type,
        workspace_id=document.workspace_id,
        policy_id=document.policy_id,
        status=DocumentStatus(document.status),
        object_key=document.object_key,
        uploaded_by=document.uploaded_by,
        uploaded_at=document.created_at,
        processed_at=document.processed_at,
        chunk_count=document.chunk_count,
        error_message=document.error_message,
    )


def _legacy_storage_to_metadata(workspace_id: str) -> list[DocumentMetadata]:
    legacy_documents = []
    for obj in list_documents(workspace_id=workspace_id):
        document_id = obj.object_name.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        legacy_documents.append(
            DocumentMetadata(
                document_id=document_id,
                filename=obj.object_name.rsplit("/", 1)[-1],
                size_bytes=obj.size_bytes,
                content_type=obj.content_type,
                workspace_id=workspace_id,
                status=DocumentStatus.INDEXED,
                object_key=obj.object_name,
                uploaded_at=datetime.utcnow(),
            )
        )
    return legacy_documents


@router.get(
    "",
    response_model=list[DocumentMetadata],
    summary="List documents in a workspace",
)
async def list_workspace_documents(
    workspace_id: str = Query(default="default", description="Workspace to list documents for."),
) -> list[DocumentMetadata]:
    """Return all documents stored under the given workspace, sourced from PostgreSQL."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Document)
                .where(Document.workspace_id == workspace_id)
                .order_by(Document.created_at.desc())
            )
            documents = list(result.scalars().all())
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Document store unavailable: {exc}",
        ) from exc

    if not documents:
        return _legacy_storage_to_metadata(workspace_id)

    # When DB records exist, treat PostgreSQL as the source of truth.
    # This avoids exposing ingestion sidecar objects (.txt/.json) as ghost documents.
    return [_document_to_metadata(doc) for doc in documents]


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload a policy document",
    description=(
        "Upload a PDF or Word document into the InsurAI ingestion pipeline. "
        "The file is stored in MinIO and a background parsing job is queued."
    ),
)
async def upload_document(
    request: Request,
    file: Annotated[UploadFile, File(description="Policy document (PDF / DOCX / TXT).")],
    workspace_id: Annotated[
        str,
        Form(description="UUID of the workspace this document belongs to."),
    ] = "default",
    x_user_id: Annotated[str | None, Header(alias="X-User-ID")] = None,
) -> DocumentUploadResponse:
    """
    Step 1 of the ingestion pipeline:
      1. Validate file type and size.
      2. Read bytes into memory (max 50 MB).
      3. Upload to MinIO under the workspace prefix.
      4. Return a DocumentUploadResponse with status=PENDING.
      5. [Celery task enqueue will be wired in T4 worker sub-task.]
    """
    try:
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
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Object storage unavailable: {exc}",
            ) from exc

        # --- Persist metadata first, then enqueue async ingestion task ---
        document_id = uuid.uuid4().hex
        linked_policy_id: str | None = None

        try:
            async with AsyncSessionLocal() as session:
                document = Document(
                    id=document_id,
                    workspace_id=workspace_id,
                    filename=file.filename or "upload.bin",
                    size_bytes=stored.size_bytes,
                    content_type=stored.content_type,
                    object_key=stored.object_name,
                    status=DocumentStatus.PENDING.value,
                    uploaded_by=x_user_id,
                )
                session.add(document)

                # Register a structured policy entity and link the document.
                policy_id = _derive_policy_id(file.filename or "upload.bin")
                existing_policy = await session.scalar(
                    select(Policy).where(
                        Policy.workspace_id == workspace_id,
                        Policy.policy_id == policy_id,
                    )
                )
                if existing_policy is None:
                    policy = Policy(
                        workspace_id=workspace_id,
                        policy_id=policy_id,
                        policy_name=(file.filename or "upload.bin").rsplit(".", 1)[0],
                        policy_type=_infer_policy_type(file.filename or "upload.bin"),
                    )
                    session.add(policy)
                else:
                    policy = existing_policy

                document.policy_id = policy.policy_id
                linked_policy_id = policy.policy_id
                if policy.primary_document_id is None:
                    policy.primary_document_id = document_id

                await session.commit()
        except Exception:
            try:
                delete_file(stored.object_name)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist document metadata",
            )

        try:
            async with AsyncSessionLocal() as session:
                await dispatch_notification_for_actor(
                    request=request,
                    session=session,
                    workspace_id=workspace_id,
                    notification_type=NotificationType.POLICY,
                    priority=NotificationPriority.MEDIUM,
                    title="Policy document uploaded",
                    message=f"{file.filename or 'Document'} queued for ingestion.",
                    metadata={
                        "document_id": document_id,
                        "filename": file.filename or "upload.bin",
                        "status": "pending",
                    },
                    dedupe_key=f"document-upload:{workspace_id}:{document_id}",
                    x_user_id=x_user_id,
                )
                await session.commit()
        except Exception:
            # Notification failure should not block ingestion.
            pass

        try:
            ingest_document.delay(document_id)
        except Exception as exc:
            logger.error("enqueue failed for document_id=%s: %s", document_id, exc, exc_info=True)
            try:
                async with AsyncSessionLocal() as session:
                    doc = await session.get(Document, document_id)
                    if doc:
                        doc.status = DocumentStatus.FAILED.value
                        doc.error_message = f"Queue unavailable: {exc}"
                        await session.commit()
            except Exception:
                logger.error(
                    "failed to update document status after enqueue error: document_id=%s",
                    document_id,
                    exc_info=True,
                )
            return DocumentUploadResponse(
                document_id=document_id,
                filename=file.filename or "upload.bin",
                size_bytes=stored.size_bytes,
                content_type=stored.content_type,
                workspace_id=workspace_id,
                status=DocumentStatus.FAILED,
                object_key=stored.object_name,
                uploaded_at=datetime.utcnow(),
            )

        return DocumentUploadResponse(
            document_id=document_id,
            filename=file.filename or "upload.bin",
            size_bytes=stored.size_bytes,
            content_type=stored.content_type,
            workspace_id=workspace_id,
            policy_id=linked_policy_id,
            status=DocumentStatus.PENDING,
            object_key=stored.object_name,
            uploaded_at=datetime.utcnow(),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected upload failure: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upload failed due to an unexpected server error",
        ) from exc


# ---------------------------------------------------------------------------
# Status Update and Retry Endpoints (Phase P4)
# ---------------------------------------------------------------------------

@router.post(
    "/{document_id}/status",
    summary="Update document processing status",
    status_code=status.HTTP_200_OK,
)
async def update_document_status(
    request: Request,
    document_id: str,
    workspace_id: str = Query(..., description="Workspace ID"),
    status: str = Query(..., description="New status: pending, processing, indexed, failed"),
    error_message: str = Query(None, description="Error details if status=failed"),
    chunk_count: int = Query(None, description="Chunk count if status=indexed"),
    x_user_id: str | None = Header(None, alias="X-User-ID"),
) -> dict:
    """
    Manual status update endpoint.

    Used for:
      1. Admin operations to override status
      2. Testing status transitions
      3. Updating document state after manual processing

    Status values:
      - pending: Document queued for processing
      - processing: Celery worker actively processing
      - indexed: Successfully embedded and indexed
      - failed: Error during ingestion
    """
    from app.database import AsyncSessionLocal
    from app.models import Document

    try:
        async with AsyncSessionLocal() as session:
            doc = await session.get(Document, document_id)
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {document_id} not found",
                )
            if doc.workspace_id != workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Workspace mismatch",
                )

            # Update status
            doc.status = status
            if error_message:
                doc.error_message = error_message
            if chunk_count is not None:
                doc.chunk_count = chunk_count
            if status == "indexed":
                doc.processed_at = datetime.utcnow()

            # Emit notification for terminal status updates.
            if status in {"indexed", "failed"}:
                priority = (
                    NotificationPriority.HIGH if status == "failed" else NotificationPriority.MEDIUM
                )
                await dispatch_notification_for_actor(
                    request=request,
                    session=session,
                    workspace_id=workspace_id,
                    notification_type=NotificationType.POLICY,
                    priority=priority,
                    title=(
                        "Policy document indexed"
                        if status == "indexed"
                        else "Policy ingestion failed"
                    ),
                    message=(
                        f"Document {document_id} indexed successfully."
                        if status == "indexed"
                        else f"Document {document_id} failed to process."
                    ),
                    metadata={
                        "document_id": document_id,
                        "status": status,
                        "chunk_count": chunk_count,
                        "error_message": error_message,
                    },
                    dedupe_key=f"document-status:{workspace_id}:{document_id}:{status}",
                    x_user_id=x_user_id,
                )

            await session.commit()

            return {
                "document_id": document_id,
                "status": status,
                "updated_at": datetime.utcnow().isoformat(),
            }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status update failed: {exc}",
        ) from exc


@router.post(
    "/{document_id}/retry",
    summary="Retry failed document ingestion",
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_document_ingestion(
    document_id: str,
    workspace_id: str = Query(..., description="Workspace ID"),
) -> dict:
    """
    Retry failed document ingestion by re-queuing Celery task.

    Conditions:
      - Document must exist and be in the same workspace
      - Document status must be "failed" or "pending"

    Returns:
      - Resets status to "pending"
      - Clears error_message
      - Re-dispatches Celery task
      - Returns new task_id for tracking
    """
    from app.database import AsyncSessionLocal
    from app.models import Document

    try:
        async with AsyncSessionLocal() as session:
            doc = await session.get(Document, document_id)
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {document_id} not found",
                )
            if doc.workspace_id != workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Workspace mismatch",
                )
            if doc.status not in ("failed", "pending"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot retry document with status={doc.status}. "
                           "Only 'failed' or 'pending' documents can be retried.",
                )

            # Reset status
            doc.status = "pending"
            doc.error_message = None
            await session.commit()

            # Re-dispatch Celery task
            task = ingest_document.delay(document_id)

            return {
                "document_id": document_id,
                "task_id": task.id,
                "status": "pending",
                "message": "Document queued for re-processing",
                "created_at": datetime.utcnow().isoformat(),
            }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retry failed: {exc}",
        ) from exc
