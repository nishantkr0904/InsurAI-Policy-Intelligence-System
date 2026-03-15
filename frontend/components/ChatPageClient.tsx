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
import ChatPanel from "@/components/ChatPanel";
import UploadPanel from "@/components/UploadPanel";
import SourcePanel from "@/components/SourcePanel";
import type { SourceCitation } from "@/lib/api";

interface Props {
  workspaceId: string;
}

export default function ChatPageClient({ workspaceId }: Props) {
  const [citations, setCitations] = useState<SourceCitation[]>([]);

  return (
    <div
      className="flex flex-1 overflow-hidden"
      style={{ height: "calc(100vh - 112px)" }}
    >
      {/* ── Left: Chat ── */}
      <section
        className="flex-1 flex flex-col border-r overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h1
            className="font-semibold text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            POLICY CHAT
          </h1>
          <span className="badge badge-accent">Workspace: {workspaceId}</span>
        </div>
        <ChatPanel workspaceId={workspaceId} onCitations={setCitations} />
      </section>

      {/* ── Right: Sources + Upload ── */}
      <aside
        className="w-80 flex flex-col gap-4 p-4 overflow-y-auto shrink-0"
        style={{ background: "var(--bg-surface)" }}
      >
        <SourcePanel citations={citations} />
        <UploadPanel workspaceId={workspaceId} />
      </aside>
    </div>
  );
}
