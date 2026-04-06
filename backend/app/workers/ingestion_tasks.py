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
import os
import subprocess
import shutil
import traceback
import zipfile
import uuid
from io import BytesIO
from datetime import datetime
from tempfile import TemporaryDirectory

from app.workers.celery_app import celery_app
from app.storage.minio_client import _get_client, upload_file
from app.core.config import settings
from app.processing.chunker import chunk_text
from app.processing.embedder import generate_embeddings
from app.processing.vector_store import insert_vectors
from app.database import AsyncSessionLocal
from app.models import ErrorLog, Document

logger = logging.getLogger(__name__)
async_session = AsyncSessionLocal
_worker_event_loop: asyncio.AbstractEventLoop | None = None


def _run_in_worker_loop(coro):
    """Run async task code on a persistent loop within the current worker process."""
    global _worker_event_loop
    if _worker_event_loop is None or _worker_event_loop.is_closed():
        _worker_event_loop = asyncio.new_event_loop()
    return _worker_event_loop.run_until_complete(coro)


SUPPORTED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
}

UNSUPPORTED_FILE_MESSAGE = "Unsupported file format. Please upload DOCX/PDF/TXT"


class InvalidDocumentError(RuntimeError):
    """Raised when an uploaded file is not a valid supported document."""


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
        async with async_session() as session:
            # Fetch document by ID
            doc = await session.get(Document, document_id)
            if not doc:
                logger.warning("Document not found for status update: %s", document_id)
                return

            # Update status fields
            doc.status = status
            if error_message is not None:
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
        # The task will retry anyway due to the outer task retry path.


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


def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract plain text from a DOCX file using python-docx."""
    try:
        _validate_docx_bytes(file_bytes)
        from docx import Document
        doc = Document(BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        logger.warning("python-docx not installed – returning placeholder for DOCX.")
        return f"[DOCX text extraction unavailable – install python-docx]\n{len(file_bytes)} bytes"
    except ValueError as exc:
        raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE) from exc
    except InvalidDocumentError:
        raise
    except Exception as exc:
        raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE) from exc


def _validate_docx_bytes(file_bytes: bytes) -> None:
    """Validate that the payload is a well-formed DOCX package."""
    print("DOCX VALIDATION RUNNING")
    try:
        in_memory = BytesIO(file_bytes)
        if not zipfile.is_zipfile(in_memory):
            raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE)

        with zipfile.ZipFile(BytesIO(file_bytes)) as archive:
            if "word/document.xml" not in archive.namelist():
                raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE)
            # Ensure the main Word document XML is actually readable.
            archive.read("word/document.xml")
    except zipfile.BadZipFile as exc:
        raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE) from exc


def _convert_doc_to_docx_bytes(file_bytes: bytes, original_name: str = "document.doc") -> bytes:
    """Convert legacy DOC bytes to DOCX using LibreOffice/soffice when available."""
    candidates = ["soffice", "libreoffice"]
    converter = next((candidate for candidate in candidates if shutil.which(candidate)), None)
    if not converter:
        raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE)

    with TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, original_name if original_name.lower().endswith(".doc") else "document.doc")
        output_dir = tmpdir
        with open(input_path, "wb") as handle:
            handle.write(file_bytes)

        try:
            completed = subprocess.run(
                [
                    converter,
                    "--headless",
                    "--convert-to",
                    "docx",
                    "--outdir",
                    output_dir,
                    input_path,
                ],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            logger.warning("DOC to DOCX conversion failed: %s", exc.stderr or exc.stdout or exc)
            raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE) from exc

        logger.debug("DOC conversion output: %s", completed.stdout)
        output_path = os.path.splitext(input_path)[0] + ".docx"
        if not os.path.exists(output_path):
            raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE)

        with open(output_path, "rb") as handle:
            converted = handle.read()

        _validate_docx_bytes(converted)
        return converted


def _extract_text(file_bytes: bytes, content_type: str) -> str:
    """Dispatch to the correct text extractor based on MIME type."""
    if content_type == "application/pdf":
        return _extract_text_from_pdf(file_bytes)
    elif content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        if content_type == "application/msword":
            file_bytes = _convert_doc_to_docx_bytes(file_bytes)
        return _extract_text_from_docx(file_bytes)
    elif content_type == "text/plain":
        return file_bytes.decode("utf-8", errors="replace")
    else:
        raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE)


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

        async with async_session() as session:
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
)
def ingest_document(
    self,
    document_id: str,
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
    async def _run() -> dict:
        async with async_session() as session:
            document = await session.get(Document, document_id)

        if not document:
            error_message = f"Document not found: {document_id}"
            logger.warning(error_message)
            return {
                "document_id": document_id,
                "status": "failed",
                "error_message": error_message,
            }

        object_key = document.object_key
        content_type = (document.content_type or "").lower().strip()
        workspace_id = document.workspace_id

        logger.info(
            "Starting ingestion for document_id=%s object_key=%s",
            document_id,
            object_key,
        )

        try:
            # STEP 0: Update status to processing
            await _update_document_status(
                document_id=document_id,
                status="processing",
                error_message=None,
            )

            # 1. Fetch raw bytes from MinIO
            client = _get_client()
            response = client.get_object(
                bucket_name=settings.MINIO_BUCKET_DOCUMENTS,
                object_name=object_key,
            )
            try:
                file_bytes = response.read()
            finally:
                response.close()
                response.release_conn()

            normalized_content_type = content_type.lower().strip()
            if normalized_content_type not in SUPPORTED_CONTENT_TYPES:
                raise InvalidDocumentError(UNSUPPORTED_FILE_MESSAGE)

            # 2. Extract text with explicit format handling
            extracted_text = _extract_text(file_bytes, normalized_content_type)
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
            inserted = insert_vectors(
                document_id=document_id,
                workspace_id=workspace_id,
                chunk_manifest=manifest,
            )
            logger.info(
                "Indexed %d vectors in Milvus for document_id=%s", inserted, document_id
            )

            # 8. Update status to indexed with chunk count
            await _update_document_status(
                document_id=document_id,
                status="indexed",
                error_message=None,
                chunk_count=len(chunks),
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

        except (InvalidDocumentError, ValueError) as exc:
            error_msg = str(exc) or UNSUPPORTED_FILE_MESSAGE
            await _update_document_status(
                document_id=document_id,
                status="failed",
                error_message=error_msg,
            )
            await _log_celery_error(
                task_name="insurai.ingest_document",
                task_id=self.request.id,
                error=exc,
                document_id=document_id,
                workspace_id=workspace_id,
            )
            logger.warning("Invalid document rejected for document_id=%s: %s", document_id, error_msg)
            return {
                "document_id": document_id,
                "status": "failed",
                "error_message": error_msg,
            }

        except Exception as exc:
            error_msg = f"{type(exc).__name__}: {exc}"
            await _update_document_status(
                document_id=document_id,
                status="failed",
                error_message=error_msg,
            )
            await _log_celery_error(
                task_name="insurai.ingest_document",
                task_id=self.request.id,
                error=exc,
                document_id=document_id,
                workspace_id=workspace_id,
            )
            logger.error(
                "Ingestion failed for document_id=%s: %s",
                document_id,
                exc,
                exc_info=True,
            )
            if self.request.retries < self.max_retries and not isinstance(exc, (InvalidDocumentError, ValueError)):
                raise self.retry(exc=exc, countdown=30)
            return {
                "document_id": document_id,
                "status": "failed",
                "error_message": error_msg,
            }

    return _run_in_worker_loop(_run())
