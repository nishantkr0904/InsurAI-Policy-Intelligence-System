"use client";

import Link from "next/link";
import { getUser } from "@/lib/auth";

export default function ComplianceOverviewClient() {
  const user = getUser();
  const firstName = user?.name?.trim()?.split(" ")?.[0] || user?.email?.split("@")[0] || "User";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const stats = [
    { label: "Open Compliance Issues", value: "6", tone: "var(--danger)" },
    { label: "Checks Run Today", value: "14", tone: "var(--accent)" },
    { label: "Resolved", value: "22", tone: "var(--success)" },
    { label: "Critical", value: "2", tone: "var(--warning)" },
  ];

  const recentActivity = [
    { text: "CI-42D2EEEA marked resolved", time: "12 min ago" },
    { text: "Daily compliance scan completed", time: "38 min ago" },
    { text: "2 issues escalated for legal review", time: "1 hour ago" },
    { text: "Weekly audit export generated", time: "3 hours ago" },
  ];

  const quickActions = [
    {
      href: "/compliance",
      title: "Open Compliance Checks",
      description: "Run regulatory checks and review issue list.",
    },
    {
      href: "/audit",
      title: "Open Audit Trail",
      description: "Review actions, exceptions, and approvals.",
    },
    {
      href: "/documents",
      title: "Review Policies",
      description: "Inspect policy content for risky clauses.",
    },
  ];

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Welcome Back, {displayName}!
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Compliance workload, risk insights, and actions overview
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {item.label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.tone }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div
                key={activity.text}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {activity.text}
                </p>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="block rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
                style={{ textDecoration: "none", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {action.title}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
