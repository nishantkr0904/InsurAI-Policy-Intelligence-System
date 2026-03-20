"use client";

/**
 * SourcePanel – displays source citations retrieved for the last chat query.
 *
 * Populated via the blocking POST /api/v1/chat response after each stream
 * completes.  Shows document ID, relevance score, and text preview per chunk.
 * Citations are clickable to open the PDF viewer with highlighted chunks.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "PDF Source Viewer (highlighting retrieved chunks)"
 */

import type { SourceCitation } from "@/lib/api";

interface SourcePanelProps {
  citations: SourceCitation[];
  onCitationClick?: (citation: SourceCitation) => void;
}

export default function SourcePanel({ citations, onCitationClick }: SourcePanelProps) {
  if (citations.length === 0) {
    return (
      <div className="card">
        <div className="empty-state" style={{ padding: "2rem 1rem", opacity: 0.55 }}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            style={{ color: "var(--text-secondary)" }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
            Sources will appear here after your first query.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--success-soft)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" style={{ color: "var(--success)" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          Sources
          <span
            className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {citations.length}
          </span>
        </h2>
      </div>

      <ol className="flex flex-col gap-2">
        {citations.map((c, i) => {
          const docLabel = c.filename ?? `${c.document_id.slice(0, 12)}…`;
          const pageLabel =
            c.page_number != null
              ? `p. ${c.page_number}`
              : `chunk ${c.chunk_index}`;
          const sourceUrl = `/api/v1/documents/${c.document_id}`;
          const isClickable = !!onCitationClick;

          return (
            <li
              key={i}
              className={`flex flex-col gap-1.5 p-3 rounded-lg transition-all ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-offset-1" : ""}`}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                ["--tw-ring-color" as string]: "var(--accent)",
              }}
              onClick={isClickable ? () => onCitationClick(c) : undefined}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onCitationClick(c); } : undefined}
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
              {isClickable ? (
                <span
                  className="text-xs self-start font-semibold flex items-center gap-1"
                  style={{ color: "var(--accent)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  View in PDF Viewer →
                </span>
              ) : (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs self-start hover:underline"
                  style={{ color: "var(--accent)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  View source →
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
