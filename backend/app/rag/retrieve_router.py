"""
Standalone retrieval endpoint – /api/v1/retrieve.

Returns the top-K ranked document chunks for a query WITHOUT calling
the LLM synthesizer. This is used for:
  - Retrieval quality testing and evaluation (roadmap §9)
  - Debugging the hybrid search + cross-encoder pipeline
  - Future streaming chat: client-side can display chunks before synthesis

Architecture ref:
  docs/system-architecture.md §3 – Backend Architecture
  docs/roadmap.md Phase 5 – "Expose a /api/retrieve endpoint testing hybrid search"
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.rag.retriever import retrieve
from app.rag.schemas import RetrieveRequest, RetrieveResponse, RankedChunk

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["RAG Retrieve"])


@router.post(
    "/retrieve",
    response_model=RetrieveResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve ranked policy document chunks without LLM synthesis",
)
async def retrieve_chunks(request: RetrieveRequest) -> RetrieveResponse:
    """
    Run the full hybrid retrieval pipeline (dense ANN → BM25 → cross-encoder)
    and return the ranked chunks directly — no LLM call.

    Use this endpoint to:
    - Evaluate retrieval quality before synthesis
    - Inspect which document chunks are returned for a given query
    - Build streaming UI that shows context before the LLM answer arrives

    - **query**: Natural language question (3–2000 characters)
    - **workspace_id**: Scopes the search to a specific policy workspace
    - **top_k**: Number of chunks to return (1–20, default 5)
    """
    logger.info(
        "Retrieve request: workspace=%s top_k=%d query='%s...'",
        request.workspace_id,
        request.top_k,
        request.query[:60],
    )

    try:
        chunks = retrieve(
            query=request.query,
            workspace_id=request.workspace_id,
            top_k=request.top_k,
            document_ids=request.document_ids,
        )
    except Exception as exc:
        logger.error("Retrieval failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Retrieval service unavailable: {exc}",
        )

    ranked = [
        RankedChunk(
            document_id=c.document_id,
            chunk_index=c.chunk_index,
            text=c.text,
            dense_score=round(c.dense_score, 4),
            bm25_score=round(c.bm25_score, 4),
            final_score=round(c.final_score, 4),
        )
        for c in chunks
    ]

    return RetrieveResponse(
        query=request.query,
        workspace_id=request.workspace_id,
        chunks=ranked,
        total=len(ranked),
    )
