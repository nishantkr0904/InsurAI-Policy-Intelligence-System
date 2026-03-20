"use client";

import { useRef, useState } from "react";
import { uploadDocumentWithProgress } from "@/lib/api";

interface UploadedDocument {
  id: string;
  filename: string;
  size: number;
}

interface ClaimDocumentUploadProps {
  workspaceId: string;
  documents: UploadedDocument[];
  onDocumentAdded: (doc: UploadedDocument) => void;
  onDocumentRemoved: (id: string) => void;
}

/**
 * ClaimDocumentUpload - Inline document upload component for claims form.
 * Allows users to attach supporting documents (receipts, photos, reports) to claims.
 *
 * Implements FR012 – Submit Claim Details (document attachment)
 */
export default function ClaimDocumentUpload({
  workspaceId,
  documents,
  onDocumentAdded,
  onDocumentRemoved,
}: ClaimDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadDocumentWithProgress(file, workspaceId, setProgress);
      onDocumentAdded({
        id: result.document_id,
        filename: file.name,
        size: file.size,
      });
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset input to allow re-uploading same file if needed
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-sm"
          style={{ padding: "0.5rem 1rem" }}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
              />
              Uploading {progress}%
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5m0 0l5 5m-5-5v12" />
              </svg>
              Attach Document
            </span>
          )}
        </button>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          PDF, DOCX, images up to 10MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Upload Progress */}
      {uploading && (
        <div
          className="w-full rounded-full overflow-hidden h-1.5"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "var(--accent-gradient)",
            }}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p
          className="text-xs rounded px-3 py-2"
          style={{
            color: "var(--danger)",
            background: "rgba(239,68,68,0.1)",
          }}
        >
          {error}
        </p>
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              {/* File Icon */}
              <div
                className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-soft)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ color: "var(--accent)" }}
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-medium truncate text-sm"
                  style={{ color: "var(--text-primary)" }}
                  title={doc.filename}
                >
                  {doc.filename}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatFileSize(doc.size)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => onDocumentRemoved(doc.id)}
                className="shrink-0 w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
                style={{ color: "var(--text-muted)" }}
                aria-label="Remove document"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
