"use client";

import Link from "next/link";
import { getUser } from "@/lib/auth";

export default function FraudOverviewClient() {
  const user = getUser();
  const firstName = user?.name?.trim()?.split(" ")?.[0] || user?.email?.split("@")[0] || "User";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const stats = [
    { label: "Total Alerts", value: "20", tone: "var(--text-primary)" },
    { label: "High Risk", value: "7", tone: "var(--danger)" },
    { label: "Under Review", value: "6", tone: "var(--warning)" },
    { label: "Resolved", value: "6", tone: "var(--success)" },
  ];

  const activity = [
    { text: "ALERT-AF5F6648 moved to Under Review", time: "10 min ago" },
    { text: "ALERT-D69C05A5 dismissed as false positive", time: "34 min ago" },
    { text: "High-risk claim escalated for manual investigation", time: "1 hour ago" },
    { text: "Fraud alert summary exported", time: "3 hours ago" },
  ];

  const quickActions = [
    {
      href: "/fraud",
      title: "Open Fraud Alerts",
      description: "Review flagged alerts and investigate suspicious claims.",
    },
    {
      href: "/audit",
      title: "Open Audit Trail",
      description: "Inspect activity logs for related events.",
    },
    {
      href: "/chat",
      title: "Ask Policy Chat",
      description: "Validate policy clauses during investigations.",
    },
  ];

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Welcome Back, {displayName}!
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Fraud workload, risk insights, and actions overview
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
            {activity.map((item) => (
              <div
                key={item.text}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {item.text}
                </p>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {item.time}
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
