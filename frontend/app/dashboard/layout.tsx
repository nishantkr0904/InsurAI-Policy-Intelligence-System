import type { Metadata } from "next";
import DashboardSidebar from "@/components/DashboardSidebar";

/**
 * Dashboard layout – shared sidebar navigation for role-based views.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Build role-based routing (/underwriter, /compliance)"
 *   docs/system-architecture.md §4 – "Role-specific dashboards"
 */

export const metadata: Metadata = {
  title: "Dashboard – InsurAI",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 84px)" }}>
      {/* Role-based sidebar */}
      <DashboardSidebar />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
