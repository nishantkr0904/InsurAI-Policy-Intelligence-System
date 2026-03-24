"""
LLM answer synthesizer for RAG responses.

Takes a user query and a list of retrieved chunks, builds a structured
insurance-domain context prompt, and calls an LLM via LiteLLM to
generate a grounded, cited answer.

Architecture ref:
  docs/system-architecture.md §9 – LLM Integration Strategy
  docs/roadmap.md Phase 5 – "LLM answer synthesis with source citation"

Design decisions:
  - A domain-specific system prompt instructs the LLM to behave as an
    insurance policy analysis assistant and cite sources.
  - Context is assembled from the top chunks up to MAX_CONTEXT_TOKENS.
  - Source citations include document_id and chunk_index so the frontend
    can deep-link to the original policy clause.
  - LiteLLM is used so the LLM backend is swappable via config only.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import AsyncGenerator, List

import litellm

from app.core.config import settings
from app.rag.retriever import RetrievedChunk

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are InsurAI, an expert insurance policy analysis assistant.
Your role is to answer questions about insurance policies, claims, and compliance
documents based ONLY on the provided policy excerpts.

Rules:
- Answer factually using only the provided context.
- If the answer is not in the context, say so clearly.
- Cite the source document and section for every claim you make.
- Use precise, professional language appropriate for compliance officers and underwriters.
"""


@dataclass
class SynthesisResult:
    answer: str
    sources: List[dict]      # [{document_id, chunk_index, text_preview}]
    confidence: float        # 0-1 confidence score
    model: str
    token_usage: dict



def _build_context(chunks: List[RetrievedChunk], max_chars: int = 6000) -> str:
    """Build a numbered context block from the top retrieved chunks."""
    lines = []
    total = 0
    for i, chunk in enumerate(chunks, start=1):
        excerpt = f"[{i}] (doc={chunk.document_id}, chunk={chunk.chunk_index}):\n{chunk.text}\n"
        if total + len(excerpt) > max_chars:
            break
        lines.append(excerpt)
        total += len(excerpt)
    return "\n".join(lines)


def _calculate_confidence(chunks: List[RetrievedChunk]) -> float:
    """
    Calculate confidence score based on retrieval quality.
    
    Factors:
    - Top chunk score (higher = more confident)
    - Score consistency (variance in scores)
    - Number of chunks (more chunks = higher confidence)
    
    Args:
        chunks: Retrieved chunks with scores
    
    Returns:
        Confidence score 0-1
    """
    if not chunks:
        return 0.0
    
    # Top chunk score (normalize to 0-1)
    top_score = min(chunks[0].final_score, 1.0)
    
    # Score consistency (lower variance = higher confidence)
    if len(chunks) > 1:
        scores = [min(c.final_score, 1.0) for c in chunks]
        avg_score = sum(scores) / len(scores)
        variance = sum((s - avg_score) ** 2 for s in scores) / len(scores)
        # Higher variance = lower consistency score
        consistency = max(0.0, 1.0 - (variance * 1.5))
    else:
        consistency = 0.7  # Single chunk has moderate consistency
    
    # Chunk count factor (more chunks = higher confidence, up to 5)
    chunk_count_factor = min(len(chunks) / 5.0, 1.0)
    
    # Weighted confidence calculation
    confidence = (
        0.5 * top_score +           # Top chunk score is most important
        0.3 * consistency +         # Score spread matters
        0.2 * chunk_count_factor    # More chunks helps
    )
    
    return round(min(confidence, 1.0), 3)  # Round to 3 decimals


def synthesize(
    query: str,
    chunks: List[RetrievedChunk],
    model: str | None = None,
) -> SynthesisResult:
    """
    Generate a grounded, cited answer from the retrieved chunks.

    Args:
        query:  The user's original question.
        chunks: Retrieved and re-ranked chunks from retriever.retrieve().
        model:  LiteLLM model string; defaults to settings.LLM_MODEL.

    Returns:
        SynthesisResult with answer text, sources, model name, and token usage.

    Raises:
        RuntimeError: if the LLM call fails.
    """
    model = model or settings.LLM_MODEL

    if not chunks:
        return SynthesisResult(
            answer="I could not find relevant policy information to answer your question.",
            sources=[],
            confidence=0.0,
            model=model,
            token_usage={},
        )

    context = _build_context(chunks)

    user_message = (
        f"Context from policy documents:\n\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer (cite the numbered sources above):"
    )

    try:
        response = litellm.completion(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            temperature=settings.LLM_TEMPERATURE,
            api_key=settings.OPENAI_API_KEY or None,
        )
        answer = response.choices[0].message.content or ""
        usage = {
            "prompt_tokens":     response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens":      response.usage.total_tokens,
        }
    except Exception as exc:
        logger.error("LLM synthesis failed: %s", exc)
        raise RuntimeError(f"LLM synthesis failed (model={model}): {exc}") from exc

    sources = [
        {
            "document_id":  c.document_id,
            "chunk_index":  c.chunk_index,
            "text_preview": c.text[:200],
            "score":        round(c.final_score, 4),
        }
        for c in chunks
    ]

    # Calculate confidence based on retrieval quality
    confidence = _calculate_confidence(chunks)

    logger.info(
        "Synthesized answer (%d tokens, confidence=%.2f) for query='%s...'",
        usage.get("total_tokens", 0),
        confidence,
        query[:40],
    )
    return SynthesisResult(answer=answer, sources=sources, confidence=confidence, model=model, token_usage=usage)


async def synthesize_stream(
    query: str,
    chunks: List[RetrievedChunk],
    model: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Stream a grounded answer token-by-token using Server-Sent Events (SSE).

    Yields SSE-formatted lines:
      - Content delta:  data: {"token": "<text>"}\\n\\n
      - On completion:  data: [DONE]\\n\\n
      - On error:       data: {"error": "<message>"}\\n\\n  followed by data: [DONE]

    Architecture ref:
      docs/roadmap.md Phase 6 – "streaming responses (SSE)"

    Args:
        query:   The user's original question.
        chunks:  Retrieved and re-ranked chunks from retriever.retrieve().
        model:   LiteLLM model string; defaults to settings.LLM_MODEL.

    Yields:
        SSE-formatted strings ready for FastAPI StreamingResponse.
    """
    model = model or settings.LLM_MODEL

    if not chunks:
        payload = json.dumps({"token": "I could not find relevant policy information to answer your question."})
        yield f"data: {payload}\n\n"
        yield "data: [DONE]\n\n"
        return

    context = _build_context(chunks)
    user_message = (
        f"Context from policy documents:\n\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer (cite the numbered sources above):"
    )

    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            temperature=settings.LLM_TEMPERATURE,
            api_key=settings.OPENAI_API_KEY or None,
            stream=True,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                payload = json.dumps({"token": delta})
                yield f"data: {payload}\n\n"

    except Exception as exc:
        logger.error("Streaming LLM synthesis failed: %s", exc)
        err_payload = json.dumps({"error": str(exc)})
        yield f"data: {err_payload}\n\n"

    yield "data: [DONE]\n\n"
