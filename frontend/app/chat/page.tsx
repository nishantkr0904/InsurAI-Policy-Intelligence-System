/**
 * Chat Page – /chat
 *
 * Dual-pane layout:
 *   Left  (2/3 width): ChatPanel  – real-time SSE streaming chat
 *   Right (1/3 width): UploadPanel – drag-and-drop policy ingestion
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "dual-pane view: Chat reasoning on the left,
 *   PDF Source Viewer (highlighting retrieved chunks) on the right."
 *   docs/roadmap.md Phase 7 – "handling SSE streams"
 *
 * Note: The document viewer / chunk highlighting is planned for T11.
 * This iteration delivers the chat + upload split required by the P7 gate.
 */

import ChatPanel from "@/components/ChatPanel";
import UploadPanel from "@/components/UploadPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat – InsurAI",
  description: "Ask questions about your insurance policies and get AI-powered, cited answers.",
};

/* 
 * Default workspace used when no authentication is in place.
 * In Phase P2 / Keycloak this will be derived from the JWT claim.
 */
const DEFAULT_WORKSPACE = "default";

export default function ChatPage() {
  return (
    <div
      className="flex flex-1 overflow-hidden"
      style={{ height: "calc(100vh - 112px)" }}   /* viewport minus header + footer */
    >
      {/* ── Left: Chat ── */}
      <section
        className="flex-1 flex flex-col border-r overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}>
          <h1 className="font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>
            POLICY CHAT
          </h1>
          <span className="badge badge-accent">Workspace: {DEFAULT_WORKSPACE}</span>
        </div>
        <ChatPanel workspaceId={DEFAULT_WORKSPACE} />
      </section>

      {/* ── Right: Upload + Sources ── */}
      <aside
        className="w-80 flex flex-col gap-4 p-4 overflow-y-auto shrink-0"
        style={{ background: "var(--bg-surface)" }}
      >
        <UploadPanel workspaceId={DEFAULT_WORKSPACE} />

        <div className="card">
          <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
            HOW IT WORKS
          </h2>
          <ol className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            {[
              "Upload a policy document (PDF/DOCX)",
              "The system ingests, chunks and indexes it",
              "Ask any question about coverage, exclusions or claims",
              "InsurAI retrieves relevant clauses and generates a cited answer",
            ].map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="badge badge-accent shrink-0">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
