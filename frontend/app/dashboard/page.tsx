"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isOnboarded, getUser } from "@/lib/auth";
import { getRoleDefaultRoute } from "@/lib/rbac";

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

    if (!isOnboarded()) {
      router.replace("/onboarding");
      return;
    }

    const user = getUser();
    router.replace(getRoleDefaultRoute(user?.role || null));
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
