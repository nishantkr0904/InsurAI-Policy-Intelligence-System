"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import QueryAnalyticsCharts from "@/components/QueryAnalyticsCharts";
import QueryLogTable from "@/components/QueryLogTable";
import type { QueryLogEntry } from "@/lib/api";

// Mock query logs generator
function generateMockQueryLogs(count: number): QueryLogEntry[] {
  const queries = [
    "What does the policy cover for flood damage?",
    "Is theft covered under homeowner insurance?",
    "What are the deductibles for medical claims?",
    "Can I claim for pre-existing conditions?",
    "What's the maximum coverage amount?",
    "How long do claims typically take?",
    "Are there any exclusions for natural disasters?",
    "What's included in comprehensive coverage?",
  ];

  const users = ["user-001", "user-002", "user-003", "user-004", "user-005"];
  const logs: QueryLogEntry[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 1440));

    logs.push({
      query_id: `QUERY-${String(i + 1).padStart(6, "0")}`,
      query: queries[Math.floor(Math.random() * queries.length)],
      user_id: users[Math.floor(Math.random() * users.length)],
      workspace_id: "workspace-default",
      timestamp: timestamp.toISOString(),
      response_time_ms: Math.round(300 + Math.random() * 1200),
      model: "gpt-4",
      token_usage: Math.round(100 + Math.random() * 800),
      documents_searched: Math.round(1 + Math.random() * 20),
      relevant_chunks: Math.round(1 + Math.random() * 10),
      status: Math.random() > 0.05 ? "success" : Math.random() > 0.5 ? "error" : "timeout",
    });
  }

  return logs;
}

export default function AnalyticsClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [queryLogs, setQueryLogs] = useState<QueryLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    setUser(u);

    // Simulate loading query logs
    setIsLoading(true);
    const timer = setTimeout(() => {
      const mockLogs = generateMockQueryLogs(50);
      setQueryLogs(mockLogs);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto w-full space-y-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Monitor and analyze Al query patterns, performance, and user engagement trends
        </p>
      </div>

      {/* ── Analytics Charts ────────────────────────────────────── */}
      <div>
        <h2 className="section-title">Performance Metrics</h2>
        <QueryAnalyticsCharts />
      </div>

      {/* ── Query Log Table ─────────────────────────────────────– */}
      <div>
        <h2 className="section-title">Query History</h2>
        <QueryLogTable logs={queryLogs} isLoading={isLoading} />
      </div>

      {/* ── Export & Actions ────────────────────────────────────── */}
      <div>
        <h2 className="section-title">Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Export as CSV", icon: "📥", desc: "Download query logs" },
            { label: "Generate Report", icon: "📊", desc: "Create analytics report" },
            { label: "Set Alerts", icon: "🔔", desc: "Configure notifications" },
            { label: "View Raw Data", icon: "📋", desc: "Inspect detailed logs" },
          ].map(({ label, icon, desc }) => (
            <button
              key={label}
              className="card card-hover flex flex-col gap-2 text-left"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <span className="text-lg">{icon}</span>
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                {label}
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer Info ─────────────────────────────────────────── */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          💡 <strong>Tip:</strong> Use these analytics to understand query patterns, identify optimization opportunities,
          and monitor system performance. Data updates every 5 minutes.
        </p>
      </div>
    </div>
  );
}
