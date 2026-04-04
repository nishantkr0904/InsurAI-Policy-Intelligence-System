"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";

/**
 * Dashboard router – redirects to role-specific dashboard.
 * FR025-FR027: policy analytics, query analytics, risk trends.
 */

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const user = getUser();
    const role = user?.role || "underwriter";

    // Redirect to role-specific dashboard
    switch (role) {
      case "underwriter":
        router.replace("/dashboard/underwriter");
        break;
      case "compliance_officer":
        router.replace("/dashboard/compliance");
        break;
      case "claims_adjuster":
      case "claims_team":
        router.replace("/dashboard/underwriter"); // Use underwriter for now
        break;
      default:
        router.replace("/dashboard/underwriter");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
