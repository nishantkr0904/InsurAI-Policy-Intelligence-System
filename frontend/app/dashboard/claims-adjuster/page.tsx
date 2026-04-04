"use client";

import AuthGuard from "@/components/AuthGuard";
import ClaimsAdjusterDashboard from "@/components/claims/ClaimsAdjusterDashboard";

/**
 * Claims adjuster overview dashboard route.
 */
export default function ClaimsAdjusterDashboardPage() {
  return (
    <AuthGuard allowedRoles={["claims_adjuster", "admin"]}>
      <div className="px-6 py-6 max-w-7xl mx-auto w-full">
        <ClaimsAdjusterDashboard />
      </div>
    </AuthGuard>
  );
}
