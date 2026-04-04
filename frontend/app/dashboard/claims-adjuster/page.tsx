"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

/**
 * Claims adjuster dashboard entrypoint.
 * Redirects to the dedicated claims workspace.
 */
export default function ClaimsAdjusterDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/claims");
  }, [router]);

  return (
    <AuthGuard allowedRoles={["claims_adjuster", "admin"]}>
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading claims workspace...
        </p>
      </div>
    </AuthGuard>
  );
}
