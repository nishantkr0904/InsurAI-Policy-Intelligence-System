"""
RAG chat API router.

Exposes POST /api/v1/chat as the primary question-answering endpoint.

Pipeline per request:
  1. retrieve()   – hybrid dense+BM25 search over workspace chunks
  2. synthesize() – LLM generates a grounded answer with source citations
  3. detect_warnings() – Identify edge cases (low confidence, conflicting data, etc)

Architecture ref:
  docs/system-architecture.md §3 – Backend Architecture
  docs/roadmap.md Phase 5 – "Query router and /api/v1/chat endpoint"
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.rag.retriever import retrieve
from app.rag.synthesizer import synthesize
from app.rag.schemas import ChatRequest, ChatResponse, SourceCitation, EdgeCaseWarning
from app.health.service import (
    create_low_confidence_warning,
    create_conflicting_data_warning,
    create_no_data_warning,
)

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
    
    Edge case handling:
      - Low confidence queries (<0.6) trigger warning
      - Conflicting sources detected automatically
      - No relevant data returns graceful response
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
            document_ids=request.document_ids,
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

    # Step 3 – Detect edge cases and generate warnings
    warnings: list[EdgeCaseWarning] = []
    
    # Check confidence level
    if result.confidence < 0.6:
        warnings.append(create_low_confidence_warning(result.confidence, request.query))
    
    # Check for no data found
    if len(chunks) == 0:
        warnings.append(create_no_data_warning(request.query))
    
    # Check for conflicting sources (simplified: multiple sources with varying scores)
    elif len(chunks) >= 2 and result.confidence < 0.7:
        score_variance = max([c.final_score for c in chunks]) - min([c.final_score for c in chunks])
        if score_variance > 0.3:  # High variance suggests conflicting data
            doc_ids = list(set([c.document_id for c in chunks]))
            warnings.append(
                create_conflicting_data_warning(
                    [f"Chunk {c.chunk_index} from {c.document_id}" for c in chunks[:3]],
                    doc_ids,
                )
            )
    
    # Calculate confidence category
    if result.confidence >= 0.8:
        confidence_category = "high"
    elif result.confidence >= 0.6:
        confidence_category = "medium"
    else:
        confidence_category = "low"

    return ChatResponse(
        answer=result.answer,
        sources=[SourceCitation(**s) for s in result.sources],
        confidence=result.confidence,
        confidence_category=confidence_category,
        model=result.model,
        token_usage=result.token_usage,
        retrieved_chunks=len(chunks),
        warnings=warnings,
    )
