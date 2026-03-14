"""
RAG chat API router.

Exposes POST /api/v1/chat as the primary question-answering endpoint.

Pipeline per request:
  1. retrieve()   – hybrid dense+BM25 search over workspace chunks
  2. synthesize() – LLM generates a grounded answer with source citations

Architecture ref:
  docs/system-architecture.md §3 – Backend Architecture
  docs/roadmap.md Phase 5 – "Query router and /api/v1/chat endpoint"
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.rag.retriever import retrieve
from app.rag.synthesizer import synthesize
from app.rag.schemas import ChatRequest, ChatResponse, SourceCitation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["RAG Chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Query policy documents using RAG",
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Answer a natural language question by retrieving relevant policy
    document chunks and synthesizing a grounded answer via the LLM.

    - **query**: The user's question (3–2000 characters)
    - **workspace_id**: Scopes the search to a specific policy workspace
    - **top_k**: Number of chunks to retrieve (1–20, default 5)
    - **model**: Optional LLM model override
    """
    logger.info(
        "Chat request received: workspace=%s top_k=%d query='%s...'",
        request.workspace_id,
        request.top_k,
        request.query[:60],
    )

    # Step 1 – Retrieve relevant chunks
    try:
        chunks = retrieve(
            query=request.query,
            workspace_id=request.workspace_id,
            top_k=request.top_k,
        )
    except Exception as exc:
        logger.error("Retrieval failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Retrieval service unavailable: {exc}",
        )

    # Step 2 – Synthesize answer from retrieved chunks
    try:
        result = synthesize(
            query=request.query,
            chunks=chunks,
            model=request.model,
        )
    except RuntimeError as exc:
        logger.error("Synthesis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM synthesis unavailable: {exc}",
        )

    return ChatResponse(
        answer=result.answer,
        sources=[SourceCitation(**s) for s in result.sources],
        model=result.model,
        token_usage=result.token_usage,
        retrieved_chunks=len(chunks),
    )
