"""
Embedding generation service.

Converts text chunks into high-dimensional vector embeddings using
LiteLLM as the universal provider interface. Supports both cloud
embedding models (OpenAI text-embedding-3-small) and local models
(nomic-embed-text via Ollama) through a single configuration switch.

Architecture ref:
  docs/system-architecture.md §9 – LLM Integration Strategy
  docs/roadmap.md Phase 4 – "Connect embedding models via LiteLLM"

Design decisions:
  - LiteLLM wraps all provider calls uniformly; swapping models requires
    only a config change, no code refactoring.
  - Batching: embeddings are requested in configurable batches to avoid
    rate-limit errors on large document ingestion.
  - Returns plain Python floats (not numpy) to keep the output
    JSON-serialisable for Celery result storage.
"""

from __future__ import annotations

import logging
from typing import List

import litellm

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_BATCH_SIZE: int = 32  # Chunks per embedding API call


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def generate_embeddings(
    texts: List[str],
    model: str | None = None,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> List[List[float]]:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts:       List of chunk texts to embed.
        model:       Embedding model identifier (LiteLLM format).
                     Defaults to settings.EMBEDDING_MODEL.
        batch_size:  Number of texts per API call.

    Returns:
        List of embedding vectors (each a list of floats), in the same
        order as the input texts.

    Raises:
        RuntimeError: if the embedding call fails after provider retries.
    """
    if not texts:
        return []

    model = model or settings.EMBEDDING_MODEL
    all_embeddings: List[List[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        logger.debug(
            "Embedding batch %d/%d (%d chunks) using model '%s'",
            i // batch_size + 1,
            -(-len(texts) // batch_size),  # ceiling division
            len(batch),
            model,
        )
        try:
            response = litellm.embedding(
                model=model,
                input=batch,
                api_key=settings.OPENAI_API_KEY or None,
            )
            batch_vectors = [item["embedding"] for item in response.data]
            all_embeddings.extend(batch_vectors)
        except Exception as exc:
            logger.error(
                "Embedding failed for batch starting at index %d: %s", i, exc
            )
            raise RuntimeError(
                f"Embedding generation failed (model={model}, batch_start={i}): {exc}"
            ) from exc

    logger.info(
        "Generated %d embeddings for %d input texts.",
        len(all_embeddings),
        len(texts),
    )
    return all_embeddings


def embedding_dimension(model: str | None = None) -> int:
    """
    Return the expected vector dimension for the configured embedding model.
    Used when creating Milvus collection schemas in Phase P4 T6.

    Args:
        model: LiteLLM model string; falls back to settings.EMBEDDING_MODEL.

    Returns:
        Integer dimension count.
    """
    model = model or settings.EMBEDDING_MODEL
    # Well-known dimension map; extend as new models are added
    dimension_map = {
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        "text-embedding-ada-002": 1536,
        "openai/text-embedding-3-small": 1536,
        "nomic-embed-text": 768,
        "ollama/nomic-embed-text": 768,
    }
    dim = dimension_map.get(model)
    if dim is None:
        logger.warning(
            "Unknown embedding dimension for model '%s'; defaulting to 1536.", model
        )
        return 1536
    return dim
