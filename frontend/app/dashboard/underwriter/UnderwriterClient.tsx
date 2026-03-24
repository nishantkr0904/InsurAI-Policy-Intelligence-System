"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, isDemoUser } from "@/lib/auth";
import DocumentProcessing from "@/components/underwriter/DocumentProcessing";
import PolicyChat from "@/components/underwriter/PolicyChat";
import RiskAssessmentPanel from "@/components/underwriter/RiskAssessmentPanel";
import AnalyticsDashboard from "@/components/underwriter/AnalyticsDashboard";
import SystemHealth from "@/components/underwriter/SystemHealth";
import ExportPanel from "@/components/underwriter/ExportPanel";

type TabView = "overview" | "documents" | "chat" | "risk" | "analytics";

export default function UnderwriterClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabView>("overview");
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

  const tabs: { id: TabView; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "documents", label: "Documents", icon: "📄" },
    { id: "chat", label: "Policy Chat", icon: "💬" },
    { id: "risk", label: "Risk Assessment", icon: "⚖️" },
    { id: "analytics", label: "Analytics", icon: "📈" },
  ];

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

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === id ? "rgba(59,130,246,0.12)" : "transparent",
                color: activeTab === id ? "var(--accent)" : "var(--text-secondary)",
                border: activeTab === id ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && <OverviewTab workspaceId={workspace} isDemo={isDemo} setActiveTab={setActiveTab} />}
        {activeTab === "documents" && <DocumentProcessing workspaceId={workspace} isDemo={isDemo} />}
        {activeTab === "chat" && <PolicyChat workspaceId={workspace} isDemo={isDemo} />}
        {activeTab === "risk" && <RiskAssessmentPanel workspaceId={workspace} isDemo={isDemo} />}
        {activeTab === "analytics" && <AnalyticsDashboard workspaceId={workspace} isDemo={isDemo} />}
      </div>
    </div>
  );
}

/** Overview Tab - Dashboard summary */
function OverviewTab({
  workspaceId,
  isDemo,
  setActiveTab
}: {
  workspaceId: string;
  isDemo: boolean;
  setActiveTab: (tab: TabView) => void;
}) {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Documents Indexed", value: isDemo ? "24" : "—", icon: "📄", color: "var(--accent)" },
          { label: "Avg Risk Score", value: isDemo ? "42" : "—", icon: "⚖️", color: "var(--warning)" },
          { label: "Policies Reviewed", value: isDemo ? "156" : "—", icon: "📋", color: "var(--success)" },
          { label: "High Risk", value: isDemo ? "8" : "—", icon: "⚠️", color: "var(--danger)" },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{icon}</span>
              <span className="text-2xl font-bold" style={{ color }}>
                {value}
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
            {isDemo ? (
              [
                { action: "Risk assessment completed", policy: "HOME-2024-001", time: "2 min ago" },
                { action: "Document indexed", policy: "AUTO-2024-087", time: "15 min ago" },
                { action: "Policy query answered", policy: "COMM-2024-045", time: "1 hour ago" },
              ].map((item, i) => (
                <div key={i} className="flex items-start justify-between p-2 rounded" style={{ background: "var(--bg-surface)" }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.action}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.policy}</p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.time}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                No recent activity
              </p>
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
              { label: "Upload Policy Document", icon: "📤", tab: "documents" as TabView },
              { label: "Run Risk Assessment", icon: "⚖️", tab: "risk" as TabView },
              { label: "Query Policy", icon: "💬", tab: "chat" as TabView },
              { label: "View Analytics", icon: "📈", tab: "analytics" as TabView },
            ].map(({ label, icon, tab }) => (
              <button
                key={label}
                onClick={() => setActiveTab(tab)}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
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
