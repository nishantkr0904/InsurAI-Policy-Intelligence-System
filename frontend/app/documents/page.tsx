import type { Metadata } from "next";
import DocumentTable from "@/components/DocumentTable";
import AuthGuard from "@/components/AuthGuard";

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
    <AuthGuard>
      <div className="max-w-4xl mx-auto w-full space-y-6 px-6 py-6">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Documents
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Uploaded policy documents and their ingestion status.
            </p>
          </div>

          <a href="/chat" className="btn-primary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Upload Policy
          </a>
        </div>

        {/* ── Document table ── */}
        <DocumentTable workspaceId={WORKSPACE_ID} />
      </div>
    </AuthGuard>
  );
}
