"use client";

/**
 * SourcePanel – displays source citations retrieved for the last chat query.
 *
 * Populated via the blocking POST /api/v1/chat response after each stream
 * completes.  Shows document ID, relevance score, and text preview per chunk.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "PDF Source Viewer (highlighting retrieved chunks)"
 */

import type { SourceCitation } from "@/lib/api";

interface SourcePanelProps {
  citations: SourceCitation[];
}

export default function SourcePanel({ citations }: SourcePanelProps) {
  if (citations.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-2 py-8 opacity-50">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          style={{ color: "var(--text-secondary)" }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p
          className="text-xs text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          Sources will appear here after your first query.
        </p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <h2
        className="font-semibold text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        SOURCES · {citations.length}
      </h2>

      <ol className="flex flex-col gap-2">
        {citations.map((c, i) => {
          const docLabel = c.filename ?? `${c.document_id.slice(0, 12)}…`;
          const pageLabel =
            c.page_number != null
              ? `p. ${c.page_number}`
              : `chunk ${c.chunk_index}`;
          const sourceUrl = `/api/v1/documents/${c.document_id}`;

          return (
            <li
              key={i}
              className="flex flex-col gap-1.5 p-3 rounded-lg"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Document name + score */}
              <div className="flex items-center justify-between gap-2">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium truncate hover:underline"
                  style={{ color: "var(--accent)" }}
                  title={c.filename ?? c.document_id}
                >
                  {docLabel}
                </a>
                <span className="badge badge-accent shrink-0">
                  {(c.score * 100).toFixed(0)}%
                </span>
              </div>

              {/* Page / chunk reference */}
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {pageLabel}
              </span>

              {/* Text preview */}
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: "var(--text-primary)",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {c.text_preview}
              </p>

              {/* Clickable link to source document */}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs self-start hover:underline"
                style={{ color: "var(--accent)" }}
              >
                View source →
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
