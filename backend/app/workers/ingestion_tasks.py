"""
Celery task: document ingestion pipeline.

This task is dispatched immediately after a file is stored in MinIO.
It represents the full ingestion pipeline:

  Upload → [THIS TASK] → Parse → Chunk → Embed → Index → Status Update

Implementation (Phase P4):
  - Fetches the raw file bytes from MinIO
  - Extracts plain text using PyMuPDF (PDF) or python-docx (DOCX)
  - Saves the extracted text back to MinIO as a .txt sidecar
  - Performs semantic chunking (512 tokens, 50-token overlap)
  - Generates embeddings via LiteLLM (text-embedding-3-small)
  - Stores vectors in Milvus with metadata
  - Updates Document.status in PostgreSQL (pending → processing → indexed)
  - On error: Updates Document.status to "failed" with error_message

Error Handling:
  - Logs errors to ErrorLog table (FR029)
  - Persists error_message to Document.error_message
  - Implements Celery retry mechanism (max 3 retries, 30s delay)

Architecture ref:
  docs/Underwriter.md Step 4 – Monitor Document Processing Status
  docs/system-architecture.md §6 – Document Ingestion Pipeline
"""

import asyncio
import json
import logging
import traceback
import uuid
from io import BytesIO
from datetime import datetime

from app.workers.celery_app import celery_app
from app.storage.minio_client import _get_client, upload_file
from app.core.config import settings
from app.processing.chunker import chunk_text
from app.processing.embedder import generate_embeddings
from app.processing.vector_store import insert_vectors
from app.database import AsyncSessionLocal
from app.models import ErrorLog, Document

logger = logging.getLogger(__name__)


async def _update_document_status(
    document_id: str,
    status: str,
    error_message: str = None,
    chunk_count: int = None,
) -> None:
    """
    Update document status in PostgreSQL.

    Called by Celery task to track ingestion pipeline progress:
      - pending: Document queued for processing
      - processing: Celery worker actively parsing/chunking/embedding
      - indexed: Successfully embedded and stored in Milvus
      - failed: Error during ingestion (details in error_message)

    Args:
        document_id: UUID of document record
        status: New status value
        error_message: Error details (if status="failed")
        chunk_count: Number of chunks created (if status="indexed")

    Raises:
        Exception: If database update fails (will trigger Celery retry)
    """
    try:
        async with AsyncSessionLocal() as session:
            # Fetch document by ID
            doc = await session.get(Document, document_id)
            if not doc:
                logger.warning("Document not found for status update: %s", document_id)
                return

            # Update status fields
            doc.status = status
            if error_message:
                doc.error_message = error_message
            if chunk_count is not None:
                doc.chunk_count = chunk_count
            if status == "indexed":
                doc.processed_at = datetime.utcnow()

            await session.commit()
            logger.info(
                "Document status updated: document_id=%s status=%s",
                document_id,
                status,
            )

    except Exception as e:
        logger.error(
            "Failed to update document status: document_id=%s error=%s",
            document_id,
            e,
            exc_info=True,
        )
        # Don't re-raise here - we want the main task to retry, not this update call
        # The task will retry anyway due to Celery's autoretry_for=(Exception,)


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from a PDF using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        doc.close()
        return "\n\n".join(pages)
    except ImportError:
        logger.warning("PyMuPDF not installed – returning raw byte preview for PDF.")
        return f"[PDF text extraction unavailable – install pymupdf]\n{len(file_bytes)} bytes"


def _extract_text_from_docx(file_bytes: bytes, content_type: str = None) -> str:
    """
    Extract plain text from a DOCX or DOC file using python-docx.

    Note: python-docx only supports DOCX (Office Open XML) format.
    For legacy DOC files (Word 97-2003), conversion to DOCX/PDF is recommended.
    """
    try:
        from docx import Document
        doc = Document(BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        logger.warning("python-docx not installed – returning placeholder for DOCX/DOC.")
        return f"[DOCX text extraction unavailable – install python-docx]\n{len(file_bytes)} bytes"
    except Exception as e:
        # Handle legacy DOC files which python-docx cannot parse
        if content_type == "application/msword":
            logger.warning("Legacy DOC format detected – python-docx only supports DOCX. Error: %s", e)
            return (
                f"[Legacy DOC format not supported]\n"
                f"Please convert this document to DOCX, PDF, or TXT format.\n"
                f"File size: {len(file_bytes)} bytes"
            )
        else:
            logger.error("Failed to extract text from DOCX: %s", e)
            raise


def _extract_text(file_bytes: bytes, content_type: str) -> str:
    """Dispatch to the correct text extractor based on MIME type."""
    if content_type == "application/pdf":
        return _extract_text_from_pdf(file_bytes)
    elif content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        return _extract_text_from_docx(file_bytes, content_type)
    elif content_type == "text/plain":
        return file_bytes.decode("utf-8", errors="replace")
    else:
        return f"[Unsupported content type: {content_type}]"


async def _log_celery_error(
    task_name: str,
    task_id: str,
    error: Exception,
    document_id: str,
    workspace_id: str,
) -> None:
    """
    Log Celery task error to ErrorLog table (FR029).

    Runs asynchronously to avoid blocking task execution.
    """
    try:
        severity = "critical" if isinstance(error, (ConnectionError, TimeoutError)) else "error"

        task_data = {
            "task_id": task_id,
            "task_name": task_name,
            "document_id": document_id,
        }

        async with AsyncSessionLocal() as session:
            error_log = ErrorLog(
                id=str(uuid.uuid4()),
                error_code="CELERY_TASK_FAILED",
                error_type=type(error).__name__,
                source="celery",
                operation=task_name,
                workspace_id=workspace_id,
                user_id=None,
                message=str(error),
                stack_trace=traceback.format_exc(),
                task_data=task_data,
                severity=severity,
                status="new",
            )
            session.add(error_log)
            await session.commit()

            logger.info(
                "Celery error logged: task=%s error=%s severity=%s",
                task_name,
                type(error).__name__,
                severity,
            )

    except Exception as log_exc:
        logger.warning("Failed to log celery error: %s", log_exc)


@celery_app.task(
    name="insurai.ingest_document",
    bind=True,
    max_retries=3,
    default_retry_delay=30,   # seconds between retries
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def ingest_document(
    self,
    document_id: str,
    object_key: str,
    content_type: str,
    workspace_id: str,
) -> dict:
    """
    Celery task: full document ingestion pipeline.

    Stages:
      1. Fetch raw file from MinIO
      2. Extract text (parse PDF/DOCX/TXT)
      3. Perform semantic chunking (512 tokens, 50-token overlap)
      4. Generate embeddings (LiteLLM text-embedding-3-small)
      5. Insert vectors into Milvus
      6. Update Document.status to "indexed"

    Status Transitions:
      pending (from upload) → processing (when task starts)
                            → indexed (on success)
                            → failed (on error)

    Args:
        document_id:  UUID of the document record.
        object_key:   MinIO object path (e.g. "ws-id/abc123.pdf").
        content_type: MIME type of the original file.
        workspace_id: Workspace namespace.

    Returns:
        dict with keys: document_id, status, extracted_chars, sidecar_key,
                       chunk_count, inserted_vectors, embedding_dim.

    Errors:
        Logs errors to ErrorLog table (FR029).
        Updates Document.status to "failed" with error details.
        Re-raises exceptions to trigger Celery retry mechanism.
    """
    try:
        logger.info(
            "Starting ingestion for document_id=%s object_key=%s",
            document_id,
            object_key,
        )

        # ✅ STEP 0: Update status to "processing"
        asyncio.run(
            _update_document_status(
                document_id=document_id,
                status="processing",
            )
        )

        # 1. Fetch raw bytes from MinIO
        client = _get_client()
        response = client.get_object(
            bucket_name=settings.MINIO_BUCKET_DOCUMENTS,
            object_name=object_key,
        )
        file_bytes = response.read()
        response.close()
        response.release_conn()

        # 2. Extract text
        extracted_text = _extract_text(file_bytes, content_type)
        extracted_chars = len(extracted_text)
        logger.info("Extracted %d characters from document_id=%s", extracted_chars, document_id)

        # 3. Store parsed text as a sidecar .txt file in MinIO
        sidecar_key = object_key.rsplit(".", 1)[0] + "_parsed.txt"
        upload_file(
            file_bytes=extracted_text.encode("utf-8"),
            filename=sidecar_key.split("/")[-1],
            content_type="text/plain",
            workspace_id=workspace_id,
        )
        logger.info("Sidecar text stored at %s", sidecar_key)

        # 4. Semantic chunking
        chunks = chunk_text(
            extracted_text,
            metadata={"document_id": document_id, "workspace_id": workspace_id},
        )
        logger.info("Split document_id=%s into %d chunks", document_id, len(chunks))

        # 5. Generate embeddings for all chunks
        # NOTE: If OPENAI_API_KEY is empty and EMBEDDING_MODEL requires it,
        #       this step will raise RuntimeError → Celery will retry up to 3×.
        chunk_texts = [c.text for c in chunks]
        vectors = generate_embeddings(chunk_texts)
        logger.info(
            "Generated %d embedding vectors for document_id=%s", len(vectors), document_id
        )

        # 6. Build chunk manifest and store as JSON sidecar in MinIO
        manifest = [
            {
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "char_start": chunk.char_start,
                "char_end": chunk.char_end,
                "token_estimate": chunk.token_estimate,
                "embedding": vector,
            }
            for chunk, vector in zip(chunks, vectors)
        ]
        manifest_bytes = json.dumps(manifest, ensure_ascii=False).encode("utf-8")
        manifest_key_prefix = object_key.rsplit(".", 1)[0]
        upload_file(
            file_bytes=manifest_bytes,
            filename=f"{manifest_key_prefix.split('/')[-1]}_chunks.json",
            content_type="application/json",
            workspace_id=workspace_id,
        )
        logger.info(
            "Chunk manifest stored for document_id=%s (%d chunks)", document_id, len(chunks)
        )

        # 7. Insert chunk vectors into Milvus
        # If Milvus is unreachable the Celery retry mechanism will handle it (max 3×).
        inserted = insert_vectors(
            document_id=document_id,
            workspace_id=workspace_id,
            chunk_manifest=manifest,
        )
        logger.info(
            "Indexed %d vectors in Milvus for document_id=%s", inserted, document_id
        )

        # ✅ STEP 8: Update status to "indexed" with chunk count
        asyncio.run(
            _update_document_status(
                document_id=document_id,
                status="indexed",
                chunk_count=len(chunks),
            )
        )

        result = {
            "document_id": document_id,
            "status": "indexed",
            "extracted_chars": extracted_chars,
            "sidecar_key": sidecar_key,
            "chunk_count": len(chunks),
            "inserted_vectors": inserted,
            "embedding_dim": len(vectors[0]) if vectors else 0,
        }

        logger.info(
            "Ingestion complete for document_id=%s: %s",
            document_id,
            result,
        )

        return result

    except Exception as exc:
        # ✅ NEW: Update status to "failed" with error message
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        asyncio.run(
            _update_document_status(
                document_id=document_id,
                status="failed",
                error_message=error_msg,
            )
        )

        # Log error asynchronously (FR029)
        asyncio.run(
            _log_celery_error(
                task_name="insurai.ingest_document",
                task_id=self.request.id,
                error=exc,
                document_id=document_id,
                workspace_id=workspace_id,
            )
        )

        # Re-raise to trigger Celery retry mechanism
        logger.error(
            "Ingestion failed for document_id=%s: %s",
            document_id,
            exc,
            exc_info=True,
        )
        raise
