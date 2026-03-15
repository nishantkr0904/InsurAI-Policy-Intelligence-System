"use client";

/**
 * UploadPanel – let users drag-and-drop or select a PDF/DOCX to ingest.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Implement a dual-pane view"
 *   docs/roadmap.md Phase 7 – "Display data tables fetching document management APIs"
 */

import { useRef, useState } from "react";
import { uploadDocumentWithProgress } from "@/lib/api";

interface UploadPanelProps {
  workspaceId: string;
  onUploaded?: (documentId: string) => void;
}

export default function UploadPanel({ workspaceId, onUploaded }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const uploading = progress !== null;

  async function handleFile(file: File) {
    setProgress(0);
    setStatus(null);
    try {
      const res = await uploadDocumentWithProgress(file, workspaceId, setProgress);
      setStatus({ ok: true, msg: `✓ ${file.name} queued (${res.document_id.slice(0, 8)}…)` });
      onUploaded?.(res.document_id);
    } catch (e) {
      setStatus({ ok: false, msg: `✗ Upload failed: ${(e as Error).message}` });
    } finally {
      setProgress(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="card flex flex-col gap-4">
      <h2 className="font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>
        UPLOAD POLICY
      </h2>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer py-8 transition-colors"
        style={{
          borderColor: dragging ? "var(--accent)" : "var(--border)",
          background: dragging ? "rgba(99,102,241,0.07)" : "transparent",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" style={{ color: "var(--text-secondary)" }}>
          <path d="M12 16V4m0 0-4 4m4-4 4 4" />
          <path d="M4 20h16" />
        </svg>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {uploading ? `Uploading… ${progress}%` : "Drop PDF / DOCX or click to browse"}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {/* Upload progress bar */}
      {uploading && (
        <div
          className="w-full rounded-full overflow-hidden h-1.5"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      )}

      {status && (
        <p className="text-xs rounded px-3 py-2"
          style={{
            color: status.ok ? "var(--success)" : "var(--danger)",
            background: status.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          }}>
          {status.msg}
        </p>
      )}
    </div>
  );
}
