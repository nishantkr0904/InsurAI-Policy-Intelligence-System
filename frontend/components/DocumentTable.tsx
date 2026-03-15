"use client";

/**
 * DocumentTable – lists uploaded policy documents and their ingestion status.
 *
 * Fetches from GET /api/v1/documents and auto-refreshes every 8 s while any
 * document is still in a transient state (uploading / processing).
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Display data tables fetching document management APIs"
 *   functionality_requirements.md §2.4–2.5
 */

import { useEffect, useState, useCallback } from "react";
import { fetchDocuments, type DocumentRecord } from "@/lib/api";

const STATUS_META: Record<
  DocumentRecord["status"],
  { label: string; color: string; bg: string }
> = {
  uploading:  { label: "Uploading",  color: "var(--warning)",  bg: "rgba(245,158,11,0.12)"  },
  processing: { label: "Processing", color: "var(--warning)",  bg: "rgba(245,158,11,0.12)"  },
  indexed:    { label: "Indexed",    color: "var(--success)",  bg: "rgba(34,197,94,0.12)"   },
  error:      { label: "Error",      color: "var(--danger)",   bg: "rgba(239,68,68,0.12)"   },
};

interface DocumentTableProps {
  workspaceId: string;
}

export default function DocumentTable({ workspaceId }: DocumentTableProps) {
  const [docs, setDocs]     = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchDocuments(workspaceId);
      setDocs(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Poll while any document is still in-flight
  useEffect(() => {
    const hasTransient = docs.some(
      (d) => d.status === "uploading" || d.status === "processing",
    );
    if (!hasTransient) return;
    const id = setInterval(load, 8_000);
    return () => clearInterval(id);
  }, [docs, load]);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-10 gap-3">
        <span
          className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading documents…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card text-sm px-4 py-3"
        style={{ color: "var(--danger)", background: "rgba(239,68,68,0.08)" }}
      >
        ✗ {error}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-2 py-10 opacity-50">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.2"
          style={{ color: "var(--text-secondary)" }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No documents uploaded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
            {["File", "Document ID", "Uploaded", "Status"].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.map((doc, i) => {
            const meta = STATUS_META[doc.status] ?? STATUS_META.error;
            const dateStr = doc.created_at
              ? new Date(doc.created_at).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })
              : "—";

            return (
              <tr
                key={doc.document_id}
                style={{
                  borderBottom: i < docs.length - 1 ? "1px solid var(--border)" : undefined,
                  background: "transparent",
                }}
              >
                {/* Filename */}
                <td className="px-4 py-3 font-medium max-w-[220px]">
                  <span
                    className="block truncate"
                    title={doc.filename}
                    style={{ color: "var(--text-primary)" }}
                  >
                    {doc.filename}
                  </span>
                  {doc.error_message && (
                    <span className="block text-xs mt-0.5 truncate" style={{ color: "var(--danger)" }}>
                      {doc.error_message}
                    </span>
                  )}
                </td>

                {/* Document ID */}
                <td className="px-4 py-3">
                  <span
                    className="font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {doc.document_id.slice(0, 8)}…
                  </span>
                </td>

                {/* Upload date */}
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {dateStr}
                </td>

                {/* Status badge */}
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ color: meta.color, background: meta.bg }}
                  >
                    {(doc.status === "uploading" || doc.status === "processing") && (
                      <span
                        className="inline-block w-2 h-2 rounded-full border border-current border-t-transparent animate-spin"
                        style={{ borderTopColor: "transparent" }}
                      />
                    )}
                    {meta.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
