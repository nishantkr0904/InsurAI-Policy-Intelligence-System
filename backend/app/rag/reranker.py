"""
Cross-encoder re-ranker for the RAG retrieval pipeline.

Uses LiteLLM's rerank() interface to call a cross-encoder model
(e.g., BAAI/bge-reranker-v2-m3 via Cohere or a local endpoint)
that jointly encodes the query and each candidate chunk to produce
a more accurate relevance score than the bi-encoder (dense) alone.

Architecture ref:
  docs/system-architecture.md §8 – RAG Retrieval System
  docs/roadmap.md Phase 5 – "Integrate a cross-encoder model to re-score chunks"

Design decisions:
  - LiteLLM rerank() is used so the model is swappable via RERANKER_MODEL config.
  - If the reranker is unavailable (API error / not configured), the function
    gracefully falls back to the existing BM25-fused scores from the retriever.
  - final_score on RetrievedChunk is overwritten with the cross-encoder score
    so downstream consumers (synthesizer, retrieve endpoint) always see one
    consistent score field regardless of which re-ranking stage ran.
"""

from __future__ import annotations

import logging
from typing import List

import litellm

from app.core.config import settings
from app.rag.retriever import RetrievedChunk

logger = logging.getLogger(__name__)


def rerank(
    query: str,
    chunks: List[RetrievedChunk],
    top_k: int | None = None,
) -> List[RetrievedChunk]:
    """
    Re-score retrieved chunks with a cross-encoder model via LiteLLM.

    Args:
        query:   The original user query.
        chunks:  Candidate chunks from the hybrid retriever (already BM25-fused).
        top_k:   If set, return only the top-k highest-scoring chunks.
                 If None, return all chunks in re-ranked order.

    Returns:
        List[RetrievedChunk] sorted by cross-encoder score (descending).
        Falls back to the input order (BM25-fused) on any error.
    """
    if not chunks:
        return chunks

    model = settings.RERANKER_MODEL
    if not model:
        logger.debug("RERANKER_MODEL not set – skipping cross-encoder re-rank.")
        return chunks[:top_k] if top_k else chunks

    documents = [c.text for c in chunks]

    try:
        response = litellm.rerank(
            model=model,
            query=query,
            documents=documents,
            top_n=top_k or len(chunks),
            api_key=settings.OPENAI_API_KEY or None,
        )
        # LiteLLM rerank response: response.results is a list of
        # {index: int, relevance_score: float}
        scored = {r["index"]: float(r["relevance_score"]) for r in response.results}

        # Overwrite final_score with cross-encoder score
        reranked: List[RetrievedChunk] = []
        for idx, chunk in enumerate(chunks):
            if idx in scored:
                chunk.final_score = scored[idx]
                reranked.append(chunk)

        reranked.sort(key=lambda c: c.final_score, reverse=True)
        logger.info(
            "Cross-encoder re-ranked %d → %d chunks (model=%s)",
            len(chunks),
            len(reranked),
            model,
        )
        return reranked

    except Exception as exc:
        logger.warning(
            "Cross-encoder re-rank failed (model=%s), falling back to BM25 scores: %s",
            model,
            exc,
        )
        return chunks[:top_k] if top_k else chunks
