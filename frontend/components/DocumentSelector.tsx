"use client";

import { useState, useEffect } from "react";
import { fetchDocuments, type DocumentRecord } from "@/lib/api";

interface DocumentSelectorProps {
  workspaceId: string;
  selectedDocIds: string[];
  onSelectionChange: (docIds: string[]) => void;
}

/**
 * DocumentSelector - Allows users to select which documents to query.
 * Implements FR011 – Multi-Document Query.
 *
 * Features:
 * - Fetch and display workspace documents
 * - Multi-select with checkboxes
 * - Select All / Clear All buttons
 * - Show document status (indexed, processing, etc.)
 * - Collapsible panel to save space
 */
export default function DocumentSelector({
  workspaceId,
  selectedDocIds,
  onSelectionChange,
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError(null);
      try {
        const docs = await fetchDocuments(workspaceId);
        setDocuments(docs);
        // If no selection yet and we have indexed documents, select all by default
        if (selectedDocIds.length === 0) {
          const indexedDocs = docs.filter((d) => d.status === "indexed");
          if (indexedDocs.length > 0) {
            onSelectionChange(indexedDocs.map((d) => d.document_id));
          }
        }
      } catch (e) {
        setError((e as Error).message || "Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const indexedDocs = documents.filter((d) => d.status === "indexed");
  const allSelected = indexedDocs.length > 0 && indexedDocs.every((d) => selectedDocIds.includes(d.document_id));
  const noneSelected = selectedDocIds.length === 0;
  const someSelected = !allSelected && !noneSelected;

  function toggleDocument(docId: string) {
    if (selectedDocIds.includes(docId)) {
      onSelectionChange(selectedDocIds.filter((id) => id !== docId));
    } else {
      onSelectionChange([...selectedDocIds, docId]);
    }
  }

  function selectAll() {
    onSelectionChange(indexedDocs.map((d) => d.document_id));
  }

  function clearAll() {
    onSelectionChange([]);
  }

  const statusStyles: Record<string, { color: string; bg: string }> = {
    indexed: { color: "var(--success)", bg: "var(--success-soft)" },
    processing: { color: "var(--warning)", bg: "var(--warning-soft)" },
    uploading: { color: "var(--accent)", bg: "var(--accent-soft)" },
    failed: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)" },
    error: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)" },
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        style={{ background: "transparent" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "var(--accent-soft)" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--accent)" }}
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
            Query Scope
          </span>
          {!loading && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: someSelected || allSelected ? "var(--accent-soft)" : "var(--border)",
                color: someSelected || allSelected ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {selectedDocIds.length}/{indexedDocs.length}
            </span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: "var(--text-muted)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
              />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="py-2 text-xs text-center" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}

          {/* No documents */}
          {!loading && !error && documents.length === 0 && (
            <div className="py-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>
              No documents uploaded yet
            </div>
          )}

          {/* Document list */}
          {!loading && !error && documents.length > 0 && (
            <>
              {/* Select All / Clear buttons */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Select documents to search
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={selectAll}
                    disabled={allSelected}
                    className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
                    style={{ color: "var(--accent)" }}
                  >
                    All
                  </button>
                  <button
                    onClick={clearAll}
                    disabled={noneSelected}
                    className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Document checkboxes */}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {documents.map((doc) => {
                  const isIndexed = doc.status === "indexed";
                  const isSelected = selectedDocIds.includes(doc.document_id);
                  const status = statusStyles[doc.status] || statusStyles.error;

                  return (
                    <label
                      key={doc.document_id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        isIndexed ? "hover:bg-gray-50 dark:hover:bg-gray-800/50" : "opacity-60"
                      }`}
                      style={{
                        background: isSelected ? "var(--accent-soft)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isIndexed}
                        onChange={() => toggleDocument(doc.document_id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                          title={doc.filename}
                        >
                          {doc.filename}
                        </p>
                      </div>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full capitalize shrink-0"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {doc.status}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Hint text */}
              {noneSelected && indexedDocs.length > 0 && (
                <p
                  className="text-xs py-1 text-center"
                  style={{ color: "var(--warning)" }}
                >
                  Select at least one document to enable queries
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
