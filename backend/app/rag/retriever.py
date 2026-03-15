"""
RAG retrieval service – hybrid dense + BM25 + cross-encoder pipeline.

Pipeline:
  1. Embed the user query using generate_embeddings()
  2. ANN search against Milvus (dense retrieval via search_vectors())
  3. BM25 re-rank the dense hits using the query tokens (lexical signal)
  4. Cross-encoder re-rank via reranker.rerank() for final precision scoring
  5. Return the top-k re-ranked chunks with scores and metadata

Architecture ref:
  docs/system-architecture.md §8 – RAG Retrieval System
  docs/roadmap.md Phase 5 – "Hybrid retrieval + cross-encoder re-ranker"

Design decisions:
  - BM25 is implemented with rank-bm25 (pure Python, no ML framework).
  - Dense retrieval uses the existing search_vectors() stub (Milvus COSINE ANN).
  - Cross-encoder re-ranks the BM25 candidates for final precision scoring.
  - No LlamaIndex introduced here; it is reserved for agentic workflows (Phase P8).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List

from app.processing.embedder import generate_embeddings
from app.processing.vector_store import search_vectors
from app.core.config import settings

logger = logging.getLogger(__name__)

# Weight for dense score vs BM25 score: final = ALPHA*dense + (1-ALPHA)*bm25
_ALPHA: float = 0.7
# Retrieve more candidates from Milvus, then re-rank down to top_k
_DENSE_CANDIDATE_MULTIPLIER: int = 3


@dataclass
class RetrievedChunk:
    document_id: str
    chunk_index: int
    text: str
    dense_score: float
    bm25_score: float
    final_score: float


def retrieve(
    query: str,
    workspace_id: str,
    top_k: int = 5,
) -> List[RetrievedChunk]:
    """
    Hybrid retrieval: dense ANN search fused with BM25 re-ranking.

    Args:
        query:        The user's natural language question.
        workspace_id: Workspace namespace to scope the search.
        top_k:        Number of chunks to return after re-ranking.

    Returns:
        List of RetrievedChunk, ordered by descending final_score.
    """
    if not query.strip():
        return []

    # ---- Step 1: Embed the query ----
    query_embeddings = generate_embeddings([query])
    if not query_embeddings:
        logger.warning("Query embedding returned empty result.")
        return []
    query_vector = query_embeddings[0]

    # ---- Step 2: Dense ANN retrieval (fetch more for re-ranking) ----
    dense_candidates = top_k * _DENSE_CANDIDATE_MULTIPLIER
    hits = search_vectors(
        query_embedding=query_vector,
        workspace_id=workspace_id,
        top_k=dense_candidates,
    )
    if not hits:
        logger.info("No dense hits found for workspace=%s", workspace_id)
        return []

    # ---- Step 3: BM25 re-rank ----
    try:
        from rank_bm25 import BM25Okapi
        tokenized_corpus = [h["text"].lower().split() for h in hits]
        bm25 = BM25Okapi(tokenized_corpus)
        query_tokens = query.lower().split()
        bm25_raw_scores = bm25.get_scores(query_tokens)

        # Normalise BM25 scores to [0, 1]
        max_bm25 = max(bm25_raw_scores) if max(bm25_raw_scores) > 0 else 1.0
        bm25_scores = [s / max_bm25 for s in bm25_raw_scores]
    except ImportError:
        logger.warning("rank-bm25 not installed – using dense-only retrieval.")
        bm25_scores = [0.0] * len(hits)

    # ---- Step 4: Fuse BM25 + dense scores ----
    candidates: List[RetrievedChunk] = []
    for hit, bm25_score in zip(hits, bm25_scores):
        dense_score = float(hit.get("score", 0.0))
        fused_score = _ALPHA * dense_score + (1.0 - _ALPHA) * bm25_score
        candidates.append(
            RetrievedChunk(
                document_id=hit["document_id"],
                chunk_index=hit["chunk_index"],
                text=hit["text"],
                dense_score=dense_score,
                bm25_score=bm25_score,
                final_score=fused_score,
            )
        )
    candidates.sort(key=lambda c: c.final_score, reverse=True)

    # ---- Step 5: Cross-encoder re-rank (upgrades final_score) ----
    from app.rag.reranker import rerank
    return rerank(query=query, chunks=candidates, top_k=top_k)
