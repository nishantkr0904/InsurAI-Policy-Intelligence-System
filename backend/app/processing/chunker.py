"""
Semantic text chunker.

Splits extracted document text into logically coherent chunks suitable for
embedding and retrieval. Uses header/section-based splitting first, then
falls back to paragraph-based splitting, keeping each chunk within a
configurable token-size window with a small overlap to preserve context
across chunk boundaries.

Architecture ref:
  docs/system-architecture.md §6 – Document Ingestion Pipeline
  docs/roadmap.md Phase 4 – "Semantic chunking heuristics"

Design decisions:
  - No external chunking library imported (avoids new framework guardrail).
  - Token count approximated at 4 chars/token (standard heuristic).
  - Overlap is achieved by re-appending the last N sentences of the
    previous chunk at the start of the next.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_MAX_TOKENS: int = 512    # ~2048 chars at 4 chars/token
DEFAULT_OVERLAP_TOKENS: int = 50 # ~200 chars of carry-over context
CHARS_PER_TOKEN: int = 4

# Regex patterns for section-header detection (insurance doc conventions)
_HEADER_PATTERN = re.compile(
    r"^(?:"
    r"(?:clause|section|article|schedule|appendix|part|chapter)"  # keyword headers
    r"\s+[\d\.]+|"                                                 # e.g. "Clause 1.1"
    r"[\d]+[\.\d]*\s+[A-Z]|"                                      # e.g. "1.1 General"
    r"[A-Z][A-Z\s]{4,}$"                                          # ALL-CAPS heading
    r")",
    re.IGNORECASE | re.MULTILINE,
)


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------
@dataclass
class TextChunk:
    chunk_index: int
    text: str
    char_start: int
    char_end: int
    token_estimate: int = field(init=False)
    metadata: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.token_estimate = len(self.text) // CHARS_PER_TOKEN


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _split_into_sections(text: str) -> List[str]:
    """
    Split text on detected section headers.
    If no headers found, treat the whole text as one section.
    """
    header_positions = [m.start() for m in _HEADER_PATTERN.finditer(text)]
    if not header_positions:
        return [text]

    sections: List[str] = []
    for i, pos in enumerate(header_positions):
        end = header_positions[i + 1] if i + 1 < len(header_positions) else len(text)
        sections.append(text[pos:end].strip())
    return [s for s in sections if s]


def _split_into_paragraphs(text: str) -> List[str]:
    """Split a section into paragraphs on blank lines."""
    paras = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paras if p.strip()]


def _overlap_prefix(prev_chunk_text: str, overlap_chars: int) -> str:
    """Return the last `overlap_chars` characters of the previous chunk."""
    if not prev_chunk_text or overlap_chars <= 0:
        return ""
    return prev_chunk_text[-overlap_chars:]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def chunk_text(
    text: str,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
    metadata: dict | None = None,
) -> List[TextChunk]:
    """
    Split `text` into overlapping chunks of at most `max_tokens` tokens.

    Args:
        text:           The full extracted document text.
        max_tokens:     Maximum tokens per chunk (approx 4 chars each).
        overlap_tokens: Token count to carry over from previous chunk.
        metadata:       Optional base metadata dict merged into every chunk.

    Returns:
        Ordered list of TextChunk objects.
    """
    if not text or not text.strip():
        return []

    max_chars = max_tokens * CHARS_PER_TOKEN
    overlap_chars = overlap_tokens * CHARS_PER_TOKEN
    base_meta = metadata or {}

    chunks: List[TextChunk] = []
    char_cursor = 0
    prev_text = ""

    sections = _split_into_sections(text)

    for section in sections:
        paragraphs = _split_into_paragraphs(section)
        buffer = ""

        for para in paragraphs:
            tentative = (buffer + "\n\n" + para).strip() if buffer else para

            if len(tentative) <= max_chars:
                buffer = tentative
            else:
                # Flush existing buffer as a chunk
                if buffer:
                    prefix = _overlap_prefix(prev_text, overlap_chars)
                    chunk_text_val = (prefix + "\n" + buffer).strip() if prefix else buffer
                    chunks.append(TextChunk(
                        chunk_index=len(chunks),
                        text=chunk_text_val,
                        char_start=char_cursor,
                        char_end=char_cursor + len(chunk_text_val),
                        metadata={**base_meta, "section_index": len(chunks)},
                    ))
                    char_cursor += len(buffer)
                    prev_text = buffer
                    buffer = ""

                # If single para is still too large, hard-split it
                while len(para) > max_chars:
                    slice_text = para[:max_chars]
                    prefix = _overlap_prefix(prev_text, overlap_chars)
                    chunk_text_val = (prefix + "\n" + slice_text).strip() if prefix else slice_text
                    chunks.append(TextChunk(
                        chunk_index=len(chunks),
                        text=chunk_text_val,
                        char_start=char_cursor,
                        char_end=char_cursor + len(slice_text),
                        metadata={**base_meta, "section_index": len(chunks)},
                    ))
                    char_cursor += len(slice_text)
                    prev_text = slice_text
                    para = para[max_chars - overlap_chars:]

                buffer = para

        # Flush remaining buffer at end of section
        if buffer:
            prefix = _overlap_prefix(prev_text, overlap_chars)
            chunk_text_val = (prefix + "\n" + buffer).strip() if prefix else buffer
            chunks.append(TextChunk(
                chunk_index=len(chunks),
                text=chunk_text_val,
                char_start=char_cursor,
                char_end=char_cursor + len(chunk_text_val),
                metadata={**base_meta, "section_index": len(chunks)},
            ))
            char_cursor += len(buffer)
            prev_text = buffer

    return chunks
