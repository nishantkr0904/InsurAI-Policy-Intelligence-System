"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, isDemoUser } from "@/lib/auth";
import { fetchDocuments, fetchPerformanceStats, fetchAuditAnalytics, type DocumentRecord } from "@/lib/api";
import SystemHealth from "@/components/underwriter/SystemHealth";
import ExportPanel from "@/components/underwriter/ExportPanel";

export default function UnderwriterClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    setUser(u);
    setIsDemo(isDemoUser());
  }, [router]);

  const workspace = user?.workspace ?? "default";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 border-b shrink-0"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
            >
              Underwriter Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Workspace:{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{workspace}</span>
              {isDemo && (
                <>
                  {" · "}
                  <span className="badge badge-accent" style={{ fontSize: "11px" }}>
                    Demo Mode
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SystemHealth workspaceId={workspace} isDemo={isDemo} />
            <ExportPanel workspaceId={workspace} isDemo={isDemo} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <OverviewTab workspaceId={workspace} isDemo={isDemo} />
      </div>
    </div>
  );
}

/** Overview Tab - Dashboard summary */
function OverviewTab({
  workspaceId,
  isDemo,
}: {
  workspaceId: string;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [stats, setStats] = useState({
    documentsIndexed: isDemo ? "24" : "—",
    avgRiskScore: isDemo ? "42" : "—",
    policiesReviewed: isDemo ? "156" : "—",
    highRisk: isDemo ? "8" : "—",
  });
  const [activity, setActivity] = useState<Array<{ action: string; policy: string; time: string }>>([]);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (!isDemo) {
      loadRealData();
    } else {
      setActivity([
        { action: "Risk assessment completed", policy: "HOME-2024-001", time: "2 min ago" },
        { action: "Document indexed", policy: "AUTO-2024-087", time: "15 min ago" },
        { action: "Policy query answered", policy: "COMM-2024-045", time: "1 hour ago" },
      ]);
    }
  }, [workspaceId, isDemo]);

  async function loadRealData() {
    setLoading(true);
    try {
      const [docs, perfStats, auditStats] = await Promise.all([
        fetchDocuments(workspaceId).catch(() => [] as DocumentRecord[]),
        fetchPerformanceStats(workspaceId).catch(() => null),
        fetchAuditAnalytics(workspaceId).catch(() => null),
      ]);

      const indexedDocs = docs.filter((d) => d.status === "indexed").length;

      setStats({
        documentsIndexed: String(indexedDocs),
        avgRiskScore: perfStats?.quality_score_avg ? String(Math.round(perfStats.quality_score_avg * 100)) : "—",
        policiesReviewed: auditStats ? String(auditStats.total_events) : "—",
        highRisk: "—", // Would need specific endpoint
      });

      // Transform audit data to recent activity
      if (auditStats?.top_actions) {
        const recentActivity = auditStats.top_actions.slice(0, 3).map((a) => ({
          action: a.action.replace(/_/g, " "),
          policy: `${a.count} actions`,
          time: `${a.avg_duration_ms ? Math.round(a.avg_duration_ms) + "ms avg" : ""}`,
        }));
        setActivity(recentActivity);
      }
    } catch (error) {
      console.error("Failed to load overview data:", error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: "Documents Indexed", value: stats.documentsIndexed, icon: "📄", color: "var(--accent)" },
    { label: "Avg Risk Score", value: stats.avgRiskScore, icon: "⚖️", color: "var(--warning)" },
    { label: "Policies Reviewed", value: stats.policiesReviewed, icon: "📋", color: "var(--success)" },
    { label: "High Risk", value: stats.highRisk, icon: "⚠️", color: "var(--danger)" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{icon}</span>
              <span className="text-2xl font-bold" style={{ color }}>
                {loading ? "..." : value}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Recent Activity
          </h3>
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                Loading...
              </p>
            ) : activity.length > 0 ? (
              activity.map((item, i) => (
                <div key={i} className="flex items-start justify-between p-2 rounded" style={{ background: "var(--bg-surface)" }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.action}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.policy}</p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.time}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">📄</p>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  No recent activity
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Upload a policy to get started
                </p>
                <button
                  onClick={() => router.push("/documents")}
                  className="mt-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Upload Policy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Quick Actions
          </h3>
          <div className="space-y-2">
            {[
              { label: "Upload Policy Document", icon: "📤", href: "/documents" },
              { label: "Query Policies", icon: "💬", href: "/chat" },
              { label: "View Analytics", icon: "📈", href: "/analytics" },
            ].map(({ label, icon, href }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent)" }}>📋 Compliance Note:</strong> Risk assessments and AI-generated insights are recommendations only. Always verify against source documents and document all underwriting decisions for regulatory compliance.
        </p>
      </div>
    </div>
  );
}
