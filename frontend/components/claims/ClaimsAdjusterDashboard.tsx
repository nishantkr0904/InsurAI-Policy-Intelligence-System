"use client";

import Link from "next/link";
import { getUser, isDemoUser } from "@/lib/auth";

/**
 * Claims adjuster overview dashboard.
 * Separated from validation workflow to keep navigation clear.
 */
export default function ClaimsAdjusterDashboard() {
  const isDemo = isDemoUser();
  const user = getUser();
  const firstName =
    user?.name?.trim()?.split(" ")?.[0] ||
    user?.email?.split("@")[0] ||
    "User";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const stats = [
    { label: "Pending Claims", value: "24", tone: "var(--warning)" },
    { label: "In Review", value: "9", tone: "var(--accent)" },
    { label: "Approved Today", value: "12", tone: "var(--success)" },
    { label: "Flagged", value: "3", tone: "var(--danger)" },
  ];

  const activities = [
    { text: "CLM-2024-00456 moved to In Review", time: "5 min ago" },
    { text: "CLM-2024-00458 flagged for manual investigation", time: "22 min ago" },
    { text: "CLM-2024-00451 approved with conditions", time: "1 hour ago" },
    { text: "Daily claims summary exported", time: "2 hours ago" },
  ];

  const quickActions = [
    {
      href: "/claims",
      title: "Open Claims Validation",
      description: "Review queue items and run AI-assisted validation.",
    },
    {
      href: "/documents",
      title: "View Policy Documents",
      description: "Cross-check policy terms and exclusions.",
    },
    {
      href: "/chat",
      title: "Ask Policy Chat",
      description: "Clarify policy clauses during decisioning.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Welcome Back, {displayName}!
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Claims workload, risk insights, and actions overview
          </p>
        </div>
        {isDemo && (
          <span
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ background: "rgba(245,158,11,0.15)", color: "var(--warning)" }}
          >
            DEMO MODE
          </span>
        )}
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
            {activities.map((activity) => (
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
