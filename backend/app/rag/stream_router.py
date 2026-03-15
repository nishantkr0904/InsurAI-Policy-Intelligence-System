"""
Streaming SSE chat endpoint – /api/v1/chat/stream.

Implements real-time token streaming for the RAG chat pipeline using
Server-Sent Events (SSE). The client connects once and receives an
open HTTP stream of text delta tokens as the LLM generates them.

Pipeline:
  1. Retrieve relevant chunks (blocking – same as /api/v1/chat)
  2. Stream LLM completion token-by-token using synthesize_stream()
  3. Each token is sent as: data: {"token": "<text>"}\n\n
  4. Stream ends with: data: [DONE]\n\n

Architecture ref:
  docs/system-architecture.md §3 – Backend Architecture
  docs/roadmap.md Phase 6 – "Build conversational API endpoints supporting streaming responses (SSE)"
  docs/roadmap.md Phase 7 task 2 – Frontend handles SSE streams

Design decisions:
  - Retrieval is done synchronously before opening the stream so the
    first token arrives with context already resolved.
  - A 503 HTTPException is raised before streaming starts if retrieval
    fails, giving the client a clean HTTP error response.
  - Errors during streaming are sent as data: {"error": "..."} followed
    by data: [DONE] so the client can always detect stream termination.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.rag.retriever import retrieve
from app.rag.synthesizer import synthesize_stream
from app.rag.schemas import ChatStreamRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["RAG Streaming"])


@router.post(
    "/chat/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    summary="Stream a policy chat response token-by-token via SSE",
)
async def chat_stream(request: ChatStreamRequest) -> StreamingResponse:
    """
    Stream an LLM answer token-by-token for a policy question.

    The response is an SSE stream (`text/event-stream`). Each event is:
    - `data: {"token": "<text>"}` for content deltas
    - `data: [DONE]` when the stream is complete

    - **query**: The user's question (3–2000 characters)
    - **workspace_id**: Workspace namespace to scope the document search
    - **top_k**: Number of chunks to retrieve (1–20, default 5)
    - **model**: Optional LLM model override
    """
    logger.info(
        "Stream chat request: workspace=%s top_k=%d query='%s...'",
        request.workspace_id,
        request.top_k,
        request.query[:60],
    )

    # Step 1: Retrieve (blocking – must complete before stream opens)
    try:
        chunks = retrieve(
            query=request.query,
            workspace_id=request.workspace_id,
            top_k=request.top_k,
        )
    except Exception as exc:
        logger.error("Retrieval failed for stream request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Retrieval service unavailable: {exc}",
        )

    # Step 2: Stream LLM synthesis
    return StreamingResponse(
        synthesize_stream(
            query=request.query,
            chunks=chunks,
            model=request.model,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Disable Nginx proxy buffering
        },
    )
