"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import AuditLogTable from "@/components/AuditLogTable";
import AuditAnalytics from "@/components/AuditAnalytics";
import type { AuditLogEntry } from "@/lib/api";

// Mock audit log generator
function generateMockAuditLogs(count: number): AuditLogEntry[] {
  const users = [
    { id: "usr-001", name: "Alice Johnson" },
    { id: "usr-002", name: "Bob Smith" },
    { id: "usr-003", name: "Carol Davis" },
    { id: "usr-004", name: "David Wilson" },
    { id: "usr-005", name: "Eve Martinez" },
  ];

  const actionTypes: AuditLogEntry["action_type"][] = [
    "policy_upload",
    "policy_update",
    "claim_decision",
    "risk_assessment",
    "compliance_check",
    "fraud_alert",
    "login",
    "settings_change",
  ];

  const resourceTypes: AuditLogEntry["resource_type"][] = [
    "policy",
    "claim",
    "compliance",
    "fraud",
    "workspace",
  ];

  const descriptions: Record<string, string[]> = {
    policy_upload: [
      "Uploaded policy AUTO-2024-001",
      "Uploaded policy HOME-2024-042",
      "Uploaded policy COMM-2024-087",
    ],
    policy_update: [
      "Updated coverage limits",
      "Modified deductible",
      "Changed effective date",
    ],
    claim_decision: [
      "Approved claim CLM-8820",
      "Denied claim CLM-8821",
      "Pending manual review CLM-8822",
    ],
    risk_assessment: [
      "Completed risk assessment for POL-001",
      "Updated risk profile",
      "Generated risk report",
    ],
    compliance_check: [
      "Ran compliance check",
      "Compliance check passed",
      "Found 3 compliance issues",
    ],
    fraud_alert: [
      "Manual fraud alert created",
      "Fraud pattern detected",
      "Escalated suspicious claim",
    ],
    login: ["User logged in", "Login successful"],
    settings_change: [
      "Updated user profile",
      "Changed password",
      "Updated workspace settings",
    ],
  };

  const logs: AuditLogEntry[] = [];

  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];

    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 1440 * 7)); // Last 7 days

    const descList = descriptions[actionType] || ["Action completed"];
    const description = descList[Math.floor(Math.random() * descList.length)];

    logs.push({
      id: `AUDIT-${String(i + 1).padStart(6, "0")}`,
      timestamp: timestamp.toISOString(),
      user_id: user.id,
      user_name: user.name,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: `${resourceType.toUpperCase()}-${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`,
      resource_name: description,
      description: description,
      status: Math.random() > 0.05 ? "success" : "failure",
      ip_address: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function AuditClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "failures">("overview");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    setUser(u);

    // Simulate loading audit logs
    setIsLoading(true);
    const timer = setTimeout(() => {
      const mockLogs = generateMockAuditLogs(150);
      setAuditLogs(mockLogs);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  const workspace = user?.workspace ?? "default";
  const failureLogs = auditLogs.filter((log) => log.status === "failure");

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto w-full space-y-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Audit Trail
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Workspace: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{workspace}</span>
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Historical record of policy modifications, claims decisions, compliance checks, and user activity logs
        </p>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────– */}
      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        {[
          { id: "overview", label: "📊 Overview", desc: "Analytics and trends" },
          { id: "logs", label: "📋 All Logs", desc: "Complete audit trail" },
          { id: "failures", label: "⚠️ Failures", desc: `${failureLogs.length} failed actions` },
        ].map(({ id, label, desc }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === id ? "var(--accent)" : "transparent",
              color: activeTab === id ? "var(--accent)" : "var(--text-secondary)",
              background: "none",
              cursor: "pointer",
            }}
            title={desc}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Loading State ───────────────────────────────────– */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* ── Overview Tab ────────────────────────────────────– */}
      {!isLoading && activeTab === "overview" && <AuditAnalytics logs={auditLogs} />}

      {/* ── Logs Tab ────────────────────────────────────────– */}
      {!isLoading && activeTab === "logs" && <AuditLogTable logs={auditLogs} />}

      {/* ── Failures Tab ────────────────────────────────────– */}
      {!isLoading && activeTab === "failures" && (
        <div className="space-y-4">
          {failureLogs.length > 0 ? (
            <>
              <div
                className="rounded-lg p-4"
                style={{
                  background: "var(--danger-soft)",
                  border: "1px solid var(--danger)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
                  ⚠️ {failureLogs.length} failed action{failureLogs.length > 1 ? "s" : ""} require attention
                </p>
              </div>
              <AuditLogTable logs={failureLogs} onlyFailed={true} />
            </>
          ) : (
            <div
              className="rounded-lg p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="text-lg font-semibold" style={{ color: "var(--success)" }}>
                ✓ All Clear
              </p>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                No failed actions in audit log
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Export Section ──────────────────────────────────– */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Export Audit Report
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Download complete audit trail for compliance and regulatory purposes
            </p>
          </div>
          <button
            className="btn-primary shrink-0"
            style={{ textDecoration: "none", cursor: "pointer" }}
          >
            📥 Export as CSV
          </button>
        </div>
      </div>

      {/* ── Compliance Notice ───────────────────────────────– */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent)" }}>🔒 Audit Trail</strong> — Complete, immutable record of all system
          activities for regulatory compliance and forensic investigation. Maintained per SOC 2 requirements. Entries are
          timestamped, user-attributed, and cross-linked to primary records.
        </p>
      </div>
    </div>
  );
}
