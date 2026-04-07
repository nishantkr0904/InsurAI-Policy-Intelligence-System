import type { Metadata } from "next";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = { title: "Risk Assessment – InsurAI" };

export default function RiskAssessmentPage() {
  return (
    <AuthGuard allowedRoles={["underwriter", "admin"]}>
      <div className="px-6 py-6 max-w-3xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Risk Assessment
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Structured underwriting risk assessment workspace.
          </p>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title" style={{ margin: 0 }}>
              Coming Soon
            </h2>
            <span className="badge" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
              Disabled
            </span>
          </div>

          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Dedicated risk assessment page is being finalized. You can continue using current underwriting tools from the
            overview page.
          </p>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/underwriter" className="btn-secondary text-sm">
              Back to Underwriter Overview
            </Link>
            <Link href="/analytics" className="btn-ghost text-sm">
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
