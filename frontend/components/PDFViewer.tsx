"use client";

import { useState, useCallback }from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { SourceCitation } from "@/lib/api";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  citation: SourceCitation;
  onClose: () => void;
}

/**
 * PDFViewer - Displays PDF documents with highlighted retrieved chunks.
 * Implements the "PDF Source Viewer" from the dual-pane chat architecture.
 *
 * Features:
 * - Page navigation (prev/next, jump to page)
 * - Zoom controls
 * - Highlighted text chunk display
 * - Loading and error states
 */
export default function PDFViewer({ citation, onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(citation.page_number || 1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const documentUrl = `/api/v1/documents/${citation.document_id}/file`;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    // Jump to the cited page if available
    if (citation.page_number) {
      setPageNumber(citation.page_number);
    }
  }, [citation.page_number]);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message || "Failed to load PDF document");
    setLoading(false);
  }, []);

  function goToPrevPage() {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }

  function goToNextPage() {
    if (numPages) {
      setPageNumber((prev) => Math.min(numPages, prev + 1));
    }
  }

  function zoomIn() {
    setScale((prev) => Math.min(2.0, prev + 0.25));
  }

  function zoomOut() {
    setScale((prev) => Math.max(0.5, prev - 0.25));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close PDF viewer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {citation.filename || `Document ${citation.document_id.slice(0, 8)}...`}
            </h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {numPages ? `Page ${pageNumber} of ${numPages}` : "Loading..."}
              {citation.page_number && ` • Cited: p.${citation.page_number}`}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors disabled:opacity-40"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              aria-label="Zoom out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="text-xs font-medium px-2" style={{ color: "var(--text-secondary)", minWidth: "3rem", textAlign: "center" }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 2.0}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors disabled:opacity-40"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              aria-label="Zoom in"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Page navigation */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="w-8 h-8 rounded flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            aria-label="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            className="w-8 h-8 rounded flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            aria-label="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="ml-2 btn-secondary text-xs"
            style={{ padding: "0.4rem 0.75rem" }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Highlighted Chunk Banner */}
      <div
        className="px-4 py-3 border-b"
        style={{ background: "var(--accent-soft)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>
              Retrieved Chunk (Score: {(citation.score * 100).toFixed(0)}%)
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "var(--text-primary)",
                background: "rgba(255,255,255,0.6)",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid var(--accent)",
              }}
            >
              {citation.text_preview}
            </p>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4" style={{ background: "var(--bg-base)" }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 rounded-full border-4 animate-spin mb-3" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading document...</p>
          </div>
        )}

        {error && (
          <div
            className="rounded-lg p-6 text-center max-w-md"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(239,68,68,0.12)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--danger)" }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Failed to load PDF</p>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{error}</p>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in new tab
            </a>
          </div>
        )}

        {!error && (
          <Document
            file={documentUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            className="shadow-lg rounded-lg overflow-hidden"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="bg-white"
            />
          </Document>
        )}
      </div>

      {/* Footer with page jump */}
      {numPages && numPages > 1 && (
        <div
          className="flex items-center justify-center gap-3 px-4 py-2 border-t"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Go to page:
          </span>
          <input
            type="number"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val >= 1 && val <= numPages) {
                setPageNumber(val);
              }
            }}
            className="input text-center"
            style={{ width: "4rem", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            of {numPages}
          </span>
        </div>
      )}
    </div>
  );
}
