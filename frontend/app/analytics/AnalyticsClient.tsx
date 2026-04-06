"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, hydrateSession } from "@/lib/auth";
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
    let timer: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      const sessionUser = await hydrateSession();
      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      const u = getUser();
      setUser(u);

      setIsLoading(true);
      timer = setTimeout(() => {
        const mockLogs = generateMockQueryLogs(50);
        setQueryLogs(mockLogs);
        setIsLoading(false);
      }, 500);
    };

    void init();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  const underwritingInsights = useMemo(() => {
    const highRiskTerms = [
      "exclusion",
      "excluded",
      "pre-existing",
      "denied",
      "rejected",
      "fraud",
      "theft",
      "natural disaster",
      "not covered",
    ];
    const mediumRiskTerms = [
      "deductible",
      "deductibles",
      "claim",
      "waiting",
      "limit",
      "coverage amount",
      "comprehensive",
      "flood",
    ];
    const lowRiskTerms = [
      "how",
      "what",
      "included",
      "cover",
      "coverage",
    ];
    const riskFocusedTerms = [
      "risk",
      "exclusion",
      "excluded",
      "not covered",
      "pre-existing",
      "deductible",
      "denied",
      "natural disaster",
      "theft",
      "fraud",
    ];
    const ambiguousTerms = [
      "what does",
      "what's",
      "included",
      "cover",
      "coverage",
      "maximum",
      "how long",
      "can i",
    ];

    function includesAny(input: string, terms: string[]): boolean {
      return terms.some((term) => input.includes(term));
    }

    function classifyRisk(query: string): "High" | "Medium" | "Low" {
      const normalized = query.toLowerCase();
      if (includesAny(normalized, highRiskTerms)) return "High";
      if (includesAny(normalized, mediumRiskTerms)) return "Medium";
      if (includesAny(normalized, lowRiskTerms)) return "Low";
      return "Low";
    }

    function inferPolicy(query: string): string {
      const normalized = query.toLowerCase();
      if (normalized.includes("homeowner") || normalized.includes("theft")) return "Homeowners Policy";
      if (normalized.includes("medical") || normalized.includes("pre-existing")) return "Health Policy";
      if (normalized.includes("comprehensive")) return "Comprehensive Policy";
      if (normalized.includes("natural disaster") || normalized.includes("flood")) return "Catastrophe Addendum";
      return "General Policy";
    }

    function inferSection(query: string): string {
      const normalized = query.toLowerCase();
      if (normalized.includes("exclusion") || normalized.includes("not covered") || normalized.includes("pre-existing")) return "Exclusions";
      if (normalized.includes("deductible")) return "Deductibles";
      if (normalized.includes("maximum") || normalized.includes("amount") || normalized.includes("cover")) return "Coverage Limits";
      if (normalized.includes("how long") || normalized.includes("claim")) return "Claims Process";
      return "General Terms";
    }

    const total = queryLogs.length || 1;
    const distribution = { High: 0, Medium: 0, Low: 0 };
    const queryCounts = new Map<string, number>();
    const riskQueryCounts = new Map<string, number>();
    const policyCounts = new Map<string, number>();
    const sectionCounts = new Map<string, number>();

    for (const log of queryLogs) {
      const risk = classifyRisk(log.query);
      distribution[risk] += 1;
      queryCounts.set(log.query, (queryCounts.get(log.query) ?? 0) + 1);

      const normalized = log.query.toLowerCase();
      if (includesAny(normalized, riskFocusedTerms)) {
        riskQueryCounts.set(log.query, (riskQueryCounts.get(log.query) ?? 0) + 1);
      }

      const policy = inferPolicy(log.query);
      const section = inferSection(log.query);
      policyCounts.set(policy, (policyCounts.get(policy) ?? 0) + 1);
      sectionCounts.set(section, (sectionCounts.get(section) ?? 0) + 1);
    }

    const riskDistribution = [
      { level: "High", count: distribution.High, pct: Math.round((distribution.High / total) * 100) },
      { level: "Medium", count: distribution.Medium, pct: Math.round((distribution.Medium / total) * 100) },
      { level: "Low", count: distribution.Low, pct: Math.round((distribution.Low / total) * 100) },
    ];

    const mostFrequentRiskQueries = Array.from(riskQueryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count, risk: classifyRisk(query) }));

    const potentialPolicyGaps = Array.from(queryCounts.entries())
      .filter(([query, count]) => count >= 2 && includesAny(query.toLowerCase(), ambiguousTerms))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    const topSlowQueries = [...queryLogs]
      .sort((a, b) => b.response_time_ms - a.response_time_ms)
      .slice(0, 5);

    const failedQueries = queryLogs
      .filter((log) => log.status !== "success")
      .sort((a, b) => b.response_time_ms - a.response_time_ms)
      .slice(0, 5);

    const topPolicies = Array.from(policyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topSections = Array.from(sectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      riskDistribution,
      mostFrequentRiskQueries,
      potentialPolicyGaps,
      topSlowQueries,
      failedQueries,
      topPolicies,
      topSections,
    };
  }, [queryLogs]);

  function riskBadgeStyle(risk: "High" | "Medium" | "Low") {
    if (risk === "High") return { background: "var(--danger-soft)", color: "var(--danger)" };
    if (risk === "Medium") return { background: "var(--warning-soft)", color: "var(--warning)" };
    return { background: "var(--success-soft)", color: "var(--success)" };
  }

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

      {/* ── Underwriting Intelligence ───────────────────────────── */}
      <div>
        <h2 className="section-title">Underwriting Intelligence</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Risk Signals
              </h3>
              <span className="badge badge-accent">Distribution</span>
            </div>
            <div className="space-y-2">
              {underwritingInsights.riskDistribution.map((item) => (
                <div key={item.level} className="flex items-center justify-between rounded-md px-3 py-2"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="badge" style={riskBadgeStyle(item.level as "High" | "Medium" | "Low")}>{item.level}</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.count} queries</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Most Frequent Risk Queries
              </h3>
              <span className="badge badge-accent">Top 5</span>
            </div>
            <div className="space-y-2">
              {underwritingInsights.mostFrequentRiskQueries.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No risk-focused query trends yet.</p>
              ) : (
                underwritingInsights.mostFrequentRiskQueries.map((item) => (
                  <div key={item.query} className="rounded-md px-3 py-2"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.query}</p>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>x{item.count}</span>
                    </div>
                    <span className="badge mt-2" style={riskBadgeStyle(item.risk)}>{item.risk}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Potential Policy Gaps
              </h3>
              <span className="badge" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>Ambiguous</span>
            </div>
            <div className="space-y-2">
              {underwritingInsights.potentialPolicyGaps.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No repeated ambiguity detected.</p>
              ) : (
                underwritingInsights.potentialPolicyGaps.map((item) => (
                  <div key={item.query} className="flex items-center justify-between rounded-md px-3 py-2"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.query}</p>
                    <span className="text-xs" style={{ color: "var(--warning)" }}>x{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Slow / Failed Queries
              </h3>
              <span className="badge" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>Attention</span>
            </div>
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              <div>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Top Slow</p>
                <div className="space-y-2">
                  {underwritingInsights.topSlowQueries.slice(0, 3).map((item) => (
                    <div key={item.query_id} className="rounded-md px-3 py-2"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                      <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{item.query}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--warning)" }}>{item.response_time_ms} ms</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Failed</p>
                <div className="space-y-2">
                  {underwritingInsights.failedQueries.slice(0, 3).map((item) => (
                    <div key={item.query_id} className="rounded-md px-3 py-2"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                      <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{item.query}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{item.status}</p>
                    </div>
                  ))}
                  {underwritingInsights.failedQueries.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No failed queries in current sample.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Policy Usage Insights
              </h3>
              <span className="badge badge-accent">Policies & Sections</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Most Queried Policies</p>
                <div className="space-y-2">
                  {underwritingInsights.topPolicies.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      <span className="badge badge-accent">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Most Queried Sections</p>
                <div className="space-y-2">
                  {underwritingInsights.topSections.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      <span className="badge" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
