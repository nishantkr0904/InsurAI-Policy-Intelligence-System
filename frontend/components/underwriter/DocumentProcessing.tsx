"use client";

import { useEffect, useState } from "react";
import { fetchDocuments, uploadDocumentWithProgress, type DocumentRecord } from "@/lib/api";
import { toast } from "sonner";

interface DocumentProcessingProps {
  workspaceId: string;
  isDemo: boolean;
}

// Mock demo data
const DEMO_DOCUMENTS: DocumentRecord[] = [
  {
    document_id: "doc-001",
    filename: "HomeOwners_Policy_2024.pdf",
    status: "indexed",
    workspace_id: "demo",
    created_at: "2024-03-20T10:30:00Z",
  },
  {
    document_id: "doc-002",
    filename: "Auto_Insurance_Standard.pdf",
    status: "processing",
    workspace_id: "demo",
    created_at: "2024-03-24T09:15:00Z",
  },
  {
    document_id: "doc-003",
    filename: "Commercial_Property_Terms.pdf",
    status: "indexed",
    workspace_id: "demo",
    created_at: "2024-03-22T14:20:00Z",
  },
];

export default function DocumentProcessing({ workspaceId, isDemo }: DocumentProcessingProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadDocuments();
  }, [workspaceId, isDemo]);

  async function loadDocuments() {
    setLoading(true);
    try {
      if (isDemo) {
        setDocuments(DEMO_DOCUMENTS);
      } else {
        const docs = await fetchDocuments(workspaceId);
        setDocuments(docs);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "text/plain", // .txt
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF, DOC, DOCX, or TXT file");
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      if (isDemo) {
        // Simulate upload progress for demo
        for (let i = 0; i <= 100; i += 10) {
          setUploadProgress(i);
          await new Promise(r => setTimeout(r, 100));
        }
        toast.success("Document uploaded (demo mode)");
      } else {
        await uploadDocumentWithProgress(file, workspaceId, setUploadProgress);
        toast.success("Document uploaded successfully");
        await loadDocuments();
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      e.target.value = "";
    }
  }

  function getStatusInfo(status: DocumentRecord["status"]) {
    switch (status) {
      case "indexed":
        return { label: "Indexed", color: "var(--success)", bg: "var(--success-soft)" };
      case "processing":
        return { label: "Processing", color: "var(--warning)", bg: "var(--warning-soft)" };
      case "uploading":
        return { label: "Uploading", color: "var(--info)", bg: "var(--info-soft)" };
      case "error":
        return { label: "Failed", color: "var(--danger)", bg: "var(--danger-soft)" };
      default:
        return { label: "Unknown", color: "var(--text-muted)", bg: "var(--bg-surface)" };
    }
  }

  function getProcessingStage(status: DocumentRecord["status"]) {
    if (status === "processing") {
      // Simulate processing stages
      const stages = ["OCR", "Chunking", "Embedding"];
      const currentStage = stages[Math.floor(Math.random() * stages.length)];
      return currentStage;
    }
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Upload */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Policy Documents
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Upload and manage policy documents for analysis
          </p>
        </div>
        <label className="btn-primary px-4 py-2 rounded-lg text-sm cursor-pointer">
          {uploading ? "Uploading..." : "📤 Upload Document"}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Uploading...
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "var(--bg-surface)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                background: "var(--accent-gradient)",
              }}
            />
          </div>
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="w-8 h-8 rounded-full animate-spin border-2"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : documents.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="text-4xl mb-4">📄</div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            No documents yet
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Upload a policy document to get started with analysis
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const statusInfo = getStatusInfo(doc.status);
            const stage = getProcessingStage(doc.status);

            return (
              <div
                key={doc.document_id}
                className="rounded-lg p-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between">
                  {/* Document Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {doc.filename}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {new Date(doc.created_at || "").toLocaleDateString()} ·{" "}
                          {doc.document_id}
                        </p>
                      </div>
                    </div>

                    {/* Processing Stage */}
                    {stage && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {["OCR", "Chunking", "Embedding"].map((s) => (
                            <div
                              key={s}
                              className="px-3 py-1.5 rounded text-xs font-medium"
                              style={{
                                background: s === stage ? "var(--accent-soft)" : "var(--bg-surface)",
                                color: s === stage ? "var(--accent)" : "var(--text-muted)",
                                border: s === stage ? "1px solid var(--accent)" : "1px solid transparent",
                              }}
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {doc.error_message && (
                      <div
                        className="mt-2 text-xs p-2 rounded"
                        style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                      >
                        {doc.error_message}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: statusInfo.bg,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>

                    {/* Retry Button for Failed */}
                    {doc.status === "error" && (
                      <button
                        className="px-3 py-1 rounded text-xs font-medium transition-colors"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent)",
                        }}
                        onClick={() => toast.info("Retry functionality coming soon")}
                      >
                        🔄 Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Usage Info */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent)" }}>💡 Tip:</strong> Documents typically take 2-5 minutes to process.
          Once indexed, they'll be available for AI querying and risk assessment.
        </p>
      </div>
    </div>
  );
}
