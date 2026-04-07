"use client";

/**
 * UploadPanel – let users drag-and-drop or select a PDF/DOCX to ingest.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Implement a dual-pane view"
 *   docs/roadmap.md Phase 7 – "Display data tables fetching document management APIs"
 */

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  normalizeDocumentStatus,
  type DocumentRecord,
  uploadDocumentWithProgress,
} from "@/lib/api";

interface UploadPanelProps {
  workspaceId: string;
  onUploaded?: (documentId: string) => void;
}

export default function UploadPanel({ workspaceId, onUploaded }: UploadPanelProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const uploading = progress !== null;

  async function handleFile(file: File) {
    setProgress(0);
    setStatus(null);

    // Show upload started toast
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const res = await uploadDocumentWithProgress(file, workspaceId, setProgress);

      // Optimistically insert the uploaded document so users see it immediately.
      const normalizedUploadStatus = normalizeDocumentStatus(res.status);
      const optimisticStatus: DocumentRecord["status"] =
        normalizedUploadStatus === "processing"
          ? "processing"
          : normalizedUploadStatus === "failed" || normalizedUploadStatus === "error"
            ? "failed"
            : "pending";

      const optimisticDoc: DocumentRecord = {
        document_id: res.document_id,
        filename: file.name,
        workspace_id: workspaceId,
        status: optimisticStatus,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<DocumentRecord[]>(["documents", workspaceId], (current) => {
        const existing = current ?? [];
        const withoutDuplicate = existing.filter((doc) => doc.document_id !== res.document_id);
        return [optimisticDoc, ...withoutDuplicate];
      });

      setStatus({ ok: true, msg: `✓ ${file.name} queued (${res.document_id.slice(0, 8)}…)` });
      onUploaded?.(res.document_id);

      // Success toast
      toast.success(`Document uploaded successfully`, {
        id: toastId,
        description: `${file.name} is now being processed`,
      });
    } catch (e) {
      const errorMsg = (e as Error).message;
      setStatus({ ok: false, msg: `✗ Upload failed: ${errorMsg}` });

      // Error toast
      toast.error(`Upload failed`, {
        id: toastId,
        description: errorMsg,
      });
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
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--purple-soft)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" style={{ color: "var(--purple)" }}>
            <path d="M12 16V4m0 0-4 4m4-4 4 4" />
            <path d="M4 20h16" />
          </svg>
        </div>
        <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          Upload Policy
        </h2>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer py-7 transition-all duration-200"
        style={{
          borderColor: dragging ? "var(--accent)" : "var(--border)",
          background: dragging ? "var(--accent-soft)" : "rgba(255,255,255,0.02)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: dragging ? "var(--accent-soft)" : "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round"
            style={{ color: dragging ? "var(--accent)" : "var(--text-secondary)" }}>
            <path d="M12 16V4m0 0-4 4m4-4 4 4" />
            <path d="M4 20h16" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: dragging ? "var(--accent)" : "var(--text-secondary)" }}>
            {uploading ? `Uploading… ${progress}%` : "Drop PDF / DOC / DOCX / TXT here"}
          </p>
          {!uploading && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              or click to browse files
            </p>
          )}
        </div>
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
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "var(--accent-gradient)",
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
