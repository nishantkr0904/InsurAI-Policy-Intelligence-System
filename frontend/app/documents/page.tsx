import type { Metadata } from "next";
import DocumentTable from "@/components/DocumentTable";

/**
 * Documents page – lists all uploaded policy documents and their
 * ingestion status (Uploading / Processing / Indexed / Error).
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Display data tables fetching workspace and
 *                              document management APIs"
 *   functionality_requirements.md §2.4–2.5
 */

export const metadata: Metadata = { title: "Documents – InsurAI" };

/** Default workspace used across the app. Override via NEXT_PUBLIC_WORKSPACE_ID. */
const WORKSPACE_ID =
  process.env.NEXT_PUBLIC_WORKSPACE_ID ?? "default";

export default function DocumentsPage() {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 px-4 py-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Documents
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Uploaded policy documents and their ingestion status.
          </p>
        </div>

        <a href="/chat" className="btn-primary text-sm">
          + Upload &amp; Chat
        </a>
      </div>

      {/* ── Document table ── */}
      <DocumentTable workspaceId={WORKSPACE_ID} />
    </div>
  );
}
