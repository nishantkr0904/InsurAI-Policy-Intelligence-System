"use client";

/**
 * ChatPageClient – client wrapper for the /chat dual-pane layout.
 *
 * Holds citation state lifted from ChatPanel and passes it to SourcePanel.
 * Kept separate from chat/page.tsx so the page can remain a Server Component
 * and retain its <Metadata> export.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "dual-pane view: Chat reasoning on the left,
 *   PDF Source Viewer (highlighting retrieved chunks) on the right."
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import UploadPanel from "@/components/UploadPanel";
import SourcePanel from "@/components/SourcePanel";
import DocumentSelector from "@/components/DocumentSelector";
import type { SourceCitation } from "@/lib/api";

// Dynamic import PDFViewer with SSR disabled (react-pdf uses browser APIs)
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        <p className="text-sm" style={{ color: "white" }}>Loading PDF Viewer...</p>
      </div>
    </div>
  ),
});

interface Props {
  workspaceId: string;
}

export default function ChatPageClient({ workspaceId }: Props) {
  const [citations, setCitations] = useState<SourceCitation[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  return (
    <>
      <div className="flex flex-col lg:flex-row flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* ── Left: Chat ── */}
        <section
          className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r lg:overflow-hidden min-h-[65vh] lg:min-h-0"
          style={{ borderColor: "var(--border)" }}
        >
          {/* ── Left panel header ── */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "var(--accent-soft)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ color: "var(--accent)" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Policy Chat
                </h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Ask questions about your policies
                </p>
              </div>
            </div>
          </div>
          <ChatPanel
            workspaceId={workspaceId}
            onCitations={setCitations}
            documentIds={selectedDocIds.length > 0 ? selectedDocIds : undefined}
          />
        </section>

        {/* ── Right: Document Selector + Sources + Upload ── */}
        <aside
          className="w-full lg:w-80 flex flex-col gap-0 p-0 overflow-y-auto lg:shrink-0 border-t lg:border-t-0"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--border)",
          }}
        >
          {/* Warning Banner for Multiple Documents */}
          {selectedDocIds.length > 1 && (
            <div
              className="sticky top-0 z-30 px-4 py-3 mb-0 border-b"
              style={{
                background: "var(--warning-soft)",
                borderColor: "var(--warning)",
              }}
            >
              <div className="flex items-start gap-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: "var(--warning)" }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--warning)" }}>
                    Multiple documents selected
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    Answers may combine sources from {selectedDocIds.length} documents
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Document Selector - FR011 Multi-Document Query */}
          <div className="p-4 pt-4">
            <DocumentSelector
              workspaceId={workspaceId}
              selectedDocIds={selectedDocIds}
              onSelectionChange={setSelectedDocIds}
            />
          </div>

          {/* Sources and Upload */}
          <div className="flex-1 flex flex-col gap-4 px-4 pb-4 overflow-y-auto">
            <SourcePanel
              citations={citations}
              onCitationClick={setSelectedCitation}
            />
            <UploadPanel workspaceId={workspaceId} />
          </div>
        </aside>
      </div>

      {/* PDF Viewer Modal */}
      {selectedCitation && (
        <PDFViewer
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </>
  );
}
