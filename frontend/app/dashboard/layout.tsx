import type { Metadata } from "next";

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
  return <>{children}</>;
}
