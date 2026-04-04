import type { Metadata } from "next";
import AuthGuard from "@/components/AuthGuard";
import ComplianceOverviewClient from "./ComplianceOverviewClient";

/**
 * Compliance officer dashboard – regulatory flag monitor and audit tools.
 *
 * Architecture ref:
 *   docs/system-architecture.md §4 – "Compliance officers see regulatory flag monitors"
 *   docs/roadmap.md Phase 7 – "/compliance role-based route"
 */

export const metadata: Metadata = { title: "Overview – InsurAI" };

export default function CompliancePage() {
  return (
    <AuthGuard allowedRoles={["compliance_officer", "admin"]}>
      <ComplianceOverviewClient />
    </AuthGuard>
  );
}
