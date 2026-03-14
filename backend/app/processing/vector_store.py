"""
Milvus vector store client wrapper.

Provides a clean interface for all Milvus operations used in the
InsurAI ingestion and retrieval pipelines:

  - ensure_collection_exists()  – idempotent collection + index creation
  - insert_vectors()             – bulk insert chunk records from the manifest
  - search_vectors()             – ANN search (stub used by RAG in Phase P5)

Architecture ref:
  docs/system-architecture.md §7 – Vector Database (Milvus)
  docs/roadmap.md Phase 4 – "Milvus vector database integration"

Collection schema (matches _chunks.json sidecar contract):
  document_id   VARCHAR(64)   – links back to the document record
  chunk_index   INT64         – position within the document
  workspace_id  VARCHAR(64)   – multi-tenant namespace
  text          VARCHAR(4096) – raw chunk text (used by RAG context assembly)
  embedding     FLOAT_VECTOR  – dim determined by settings.EMBEDDING_MODEL
"""

from __future__ import annotations

import logging
from typing import List

from pymilvus import (
    Collection,
    CollectionSchema,
    DataType,
    FieldSchema,
    MilvusClient,
    connections,
)

from app.core.config import settings
from app.processing.embedder import embedding_dimension

logger = logging.getLogger(__name__)

_COLLECTION_NAME_CACHE: str | None = None


# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------
def _connect() -> None:
    """Ensure a Milvus gRPC connection is established (idempotent)."""
    connections.connect(
        alias="default",
        host=settings.MILVUS_HOST,
        port=settings.MILVUS_PORT,
    )


# ---------------------------------------------------------------------------
# Collection management
# ---------------------------------------------------------------------------
def ensure_collection_exists() -> Collection:
    """
    Create the document chunks collection if it does not already exist,
    then load it into memory for search.

    Returns:
        The loaded Milvus Collection object.
    """
    _connect()
    collection_name = settings.MILVUS_COLLECTION
    dim = embedding_dimension(settings.EMBEDDING_MODEL)

    from pymilvus import utility

    if utility.has_collection(collection_name):
        logger.info("Milvus collection '%s' already exists.", collection_name)
        col = Collection(collection_name)
        col.load()
        return col

    logger.info(
        "Creating Milvus collection '%s' (dim=%d).", collection_name, dim
    )

    fields = [
        FieldSchema(name="id",           dtype=DataType.INT64,    is_primary=True, auto_id=True),
        FieldSchema(name="document_id",  dtype=DataType.VARCHAR,  max_length=64),
        FieldSchema(name="chunk_index",  dtype=DataType.INT64),
        FieldSchema(name="workspace_id", dtype=DataType.VARCHAR,  max_length=64),
        FieldSchema(name="text",         dtype=DataType.VARCHAR,  max_length=4096),
        FieldSchema(name="embedding",    dtype=DataType.FLOAT_VECTOR, dim=dim),
    ]
    schema = CollectionSchema(fields=fields, description="InsurAI document chunks")
    col = Collection(name=collection_name, schema=schema)

    # Create HNSW index on the embedding field for fast ANN search
    col.create_index(
        field_name="embedding",
        index_params={
            "metric_type": "COSINE",
            "index_type": "HNSW",
            "params": {"M": 16, "efConstruction": 200},
        },
    )
    col.load()
    logger.info("Collection '%s' created and loaded.", collection_name)
    return col


# ---------------------------------------------------------------------------
# Insert
# ---------------------------------------------------------------------------
def insert_vectors(
    document_id: str,
    workspace_id: str,
    chunk_manifest: List[dict],
) -> int:
    """
    Bulk insert chunk records from the parsed manifest into Milvus.

    Args:
        document_id:     UUID of the document.
        workspace_id:    Workspace namespace.
        chunk_manifest:  List of dicts from `_chunks.json` sidecar.
                         Each dict must have: chunk_index, text, embedding.

    Returns:
        Number of vectors inserted.
    """
    if not chunk_manifest:
        logger.warning("insert_vectors called with empty manifest for doc %s", document_id)
        return 0

    col = ensure_collection_exists()

    data = [
        [document_id] * len(chunk_manifest),                       # document_id
        [c["chunk_index"] for c in chunk_manifest],                 # chunk_index
        [workspace_id] * len(chunk_manifest),                       # workspace_id
        [c["text"][:4096] for c in chunk_manifest],                 # text (capped)
        [c["embedding"] for c in chunk_manifest],                   # embedding
    ]

    result = col.insert(data)
    col.flush()
    inserted = result.insert_count
    logger.info(
        "Inserted %d vectors into Milvus for document_id=%s", inserted, document_id
    )
    return inserted


# ---------------------------------------------------------------------------
# Search (stub – wired fully in Phase P5 RAG)
# ---------------------------------------------------------------------------
def search_vectors(
    query_embedding: List[float],
    workspace_id: str,
    top_k: int = 5,
) -> List[dict]:
    """
    Perform approximate nearest-neighbour search.

    Args:
        query_embedding: Vector to search against.
        workspace_id:    Restrict results to this workspace.
        top_k:           Number of results to return.

    Returns:
        List of dicts with keys: document_id, chunk_index, text, score.
    """
    col = ensure_collection_exists()
    results = col.search(
        data=[query_embedding],
        anns_field="embedding",
        param={"metric_type": "COSINE", "params": {"ef": 64}},
        limit=top_k,
        expr=f'workspace_id == "{workspace_id}"',
        output_fields=["document_id", "chunk_index", "text"],
    )
    hits = []
    for hit in results[0]:
        hits.append({
            "document_id": hit.entity.get("document_id"),
            "chunk_index": hit.entity.get("chunk_index"),
            "text": hit.entity.get("text"),
            "score": hit.score,
        })
    return hits
