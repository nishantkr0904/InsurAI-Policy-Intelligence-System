"""
Celery task: document ingestion pipeline.

This task is dispatched immediately after a file is stored in MinIO.
It represents Step 2 of the ingestion pipeline defined in the architecture:

  Upload → [THIS TASK] → Parse → Chunk → Embed → Index

Current implementation (Phase P3):
  - Fetches the raw file bytes from MinIO.
  - Extracts plain text using PyMuPDF (PDF) or python-docx (DOCX).
  - Saves the extracted text back to MinIO as a .txt sidecar.
  - Updates the document status in the in-memory status store
    (PostgreSQL persistence will be wired in the DB migration sub-task).

Phase P4 (Embedding & Indexing) will extend this task to:
  - Semantic chunking
  - Embedding generation
  - Milvus vector storage

Architecture ref:
  docs/system-architecture.md §6 – Document Ingestion Pipeline
  docs/roadmap.md Phase 3 – step 2 "Parsing (DeepDoc/OCR)"
"""

import json
import logging
from io import BytesIO

from app.workers.celery_app import celery_app
from app.storage.minio_client import _get_client, upload_file
from app.core.config import settings
from app.processing.chunker import chunk_text
from app.processing.embedder import generate_embeddings
from app.processing.vector_store import insert_vectors

logger = logging.getLogger(__name__)


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
        from docx import Document
        doc = Document(BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        logger.warning("python-docx not installed – returning placeholder for DOCX.")
        return f"[DOCX text extraction unavailable – install python-docx]\n{len(file_bytes)} bytes"


def _extract_text(file_bytes: bytes, content_type: str) -> str:
    """Dispatch to the correct text extractor based on MIME type."""
    if content_type == "application/pdf":
        return _extract_text_from_pdf(file_bytes)
    elif content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        return _extract_text_from_docx(file_bytes)
    elif content_type == "text/plain":
        return file_bytes.decode("utf-8", errors="replace")
    else:
        return f"[Unsupported content type: {content_type}]"


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
    Celery task: fetch a document from MinIO, extract its text, and store
    a parsed sidecar file back in MinIO.

    Args:
        document_id:  UUID of the document record.
        object_key:   MinIO object path (e.g. "ws-id/abc123.pdf").
        content_type: MIME type of the original file.
        workspace_id: Workspace namespace.

    Returns:
        dict with keys: document_id, status, extracted_chars, sidecar_key.
    """
    logger.info(
        "Starting ingestion for document_id=%s object_key=%s",
        document_id,
        object_key,
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
    # Phase P4 T6 (Milvus integration) will read this sidecar to insert vectors.
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

    return {
        "document_id": document_id,
        "status": "indexed",
        "extracted_chars": extracted_chars,
        "sidecar_key": sidecar_key,
        "chunk_count": len(chunks),
        "inserted_vectors": inserted,
        "embedding_dim": len(vectors[0]) if vectors else 0,
    }
