"use client";
import AuthGuard from "@/components/AuthGuard";
import ClaimsAdjusterDashboard from "@/components/claims/ClaimsAdjusterDashboard";

/**
 * Claims validation workspace (claims_adjuster role) – FR012-FR015
 *
 * Features:
 * - Claims Queue: View and filter pending claims
 * - Claim Validation: Submit claims for AI-powered validation
 * - Validation Results: View AI analysis with confidence scores
 * - Decision Making: Approve/reject with audit logging
 * - Policy Chat: Ask follow-up questions about policies
 *
 * Matches Claims_Adjuster.md user flow documentation.
 */
export default function ClaimsPage() {
  return (
    <AuthGuard allowedRoles={["claims_adjuster", "admin"]}>
      <div className="px-6 py-6 max-w-7xl mx-auto w-full">
        <ClaimsAdjusterDashboard />
      </div>
    </AuthGuard>
  );
}
