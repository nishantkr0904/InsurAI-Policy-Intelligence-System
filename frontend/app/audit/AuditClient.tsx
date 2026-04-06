"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getWorkspaceId, hydrateSession, isDemoUser } from "@/lib/auth";
import { exportAuditLogsCsv } from "@/lib/api";
import { canExportAuditLogs } from "@/lib/rbac";
import { useAuditLogs, useAuditAnalytics } from "@/hooks/useQueries";
import AuditLogTable from "@/components/AuditLogTable";
import AuditAnalytics from "@/components/AuditAnalytics";
import type { AuditLogEntry } from "@/lib/api";
import { toast } from "sonner";

/**
 * Mock audit log generator for demo users.
 * Generates fake audit logs matching the real API schema.
 */
function generateMockAuditLogs(count: number): AuditLogEntry[] {
  const users = [
    { id: "usr-001", email: "alice@demo.com", name: "Alice Johnson" },
    { id: "usr-002", email: "bob@demo.com", name: "Bob Smith" },
    { id: "usr-003", email: "carol@demo.com", name: "Carol Davis" },
    { id: "usr-004", email: "david@demo.com", name: "David Wilson" },
    { id: "usr-005", email: "eve@demo.com", name: "Eve Martinez" },
  ];

  const actions = [
    "document_upload",
    "document_view",
    "chat_query",
    "claim_validate",
    "fraud_alert_view",
    "compliance_scan",
    "user_login",
    "settings_change",
  ];

  const severities: Array<"info" | "warning" | "error" | "critical"> = [
    "info",
    "info",
    "info",
    "warning",
    "error",
  ];

  const descriptions: Record<string, string[]> = {
    document_upload: [
      "Uploaded policy document AUTO-2024-001.pdf",
      "Uploaded policy document HOME-2024-042.pdf",
      "Uploaded policy document COMM-2024-087.pdf",
    ],
    document_view: [
      "Viewed policy document POL-123",
      "Accessed document DOC-456",
      "Opened policy file POL-789",
    ],
    chat_query: [
      "Asked: What is the coverage limit?",
      "Query: Does this policy cover flood damage?",
      "Question: What are the exclusions?",
    ],
    claim_validate: [
      "Validated claim CLM-8820",
      "Processed claim CLM-8821",
      "Reviewed claim CLM-8822",
    ],
    fraud_alert_view: [
      "Viewed fraud alert FRD-001",
      "Investigated fraud case FRD-002",
      "Escalated fraud alert FRD-003",
    ],
    compliance_scan: [
      "Ran compliance check on workspace",
      "Generated compliance report",
      "Reviewed compliance issues",
    ],
    user_login: ["User logged in successfully", "Login from new device"],
    settings_change: [
      "Updated user profile",
      "Changed notification preferences",
      "Modified workspace settings",
    ],
  };

  const logs: AuditLogEntry[] = [];

  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 1440 * 7)); // Last 7 days

    const descList = descriptions[action] || ["Action completed"];
    const description = descList[Math.floor(Math.random() * descList.length)];

    logs.push({
      audit_id: `AUDIT-${String(i + 1).padStart(6, "0")}`,
      timestamp: timestamp.toISOString(),
      workspace_id: "demo-workspace",
      user_id: user.id,
      user_email: user.email,
      action: action,
      status: Math.random() > 0.05 ? "success" : "failure",
      severity: severity,
      resource_type: "policy",
      resource_id: `RES-${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`,
      description: description,
      metadata: {
        ip_address: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
        duration_ms: Math.floor(Math.random() * 500) + 50,
      },
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function buildAuditCsv(logs: AuditLogEntry[]): string {
  const header = [
    "audit_id",
    "timestamp",
    "workspace_id",
    "user_id",
    "user_email",
    "action",
    "status",
    "severity",
    "resource_type",
    "resource_id",
    "description",
  ];

  const escapeValue = (value: string | number | null | undefined): string => {
    const raw = value === null || value === undefined ? "" : String(value);
    if (raw.includes(",") || raw.includes("\n") || raw.includes("\"")) {
      return `"${raw.replace(/\"/g, '""')}"`;
    }
    return raw;
  };

  const rows = logs.map((log) => [
    log.audit_id,
    log.timestamp,
    log.workspace_id,
    log.user_id,
    log.user_email || "",
    log.action,
    log.status,
    log.severity,
    log.resource_type || "",
    log.resource_id || "",
    log.description,
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeValue(value)).join(","))
    .join("\n");
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function AuditClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "failures">("overview");
  const [isDemo, setIsDemo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // For demo users: use mock data with local state
  const [mockLogs, setMockLogs] = useState<AuditLogEntry[]>([]);
  const [mockLoading, setMockLoading] = useState(true);

  // For real users: use TanStack Query hooks
  const workspaceId = getWorkspaceId();
  const {
    data: realLogsData,
    isLoading: realLogsLoading,
    error: realLogsError,
  } = useAuditLogs(workspaceId, { enabled: !isDemo });

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
  } = useAuditAnalytics(workspaceId, { enabled: !isDemo });

  // Initialize user and demo mode
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
      const demoMode = isDemoUser();
      setIsDemo(demoMode);

      if (demoMode) {
        setMockLoading(true);
        timer = setTimeout(() => {
          const mockData = generateMockAuditLogs(150);
          setMockLogs(mockData);
          setMockLoading(false);
        }, 500);
      }
    };

    void init();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  // Determine which data source to use
  const auditLogs = isDemo ? mockLogs : (realLogsData?.logs || []);
  const isLoading = isDemo ? mockLoading : realLogsLoading;
  const workspace = user?.workspace ?? "default";
  const canExport = isDemo || canExportAuditLogs(user?.role || null);
  const failureLogs = auditLogs.filter((log) => log.status === "failure" || log.status === "error");

  async function handleExportCsv() {
    if (isExporting) return;

    if (!canExport) {
      toast.error("Export is available to compliance officers, fraud analysts, auditors, and admins");
      return;
    }

    setIsExporting(true);

    try {
      if (isDemo) {
        const csv = buildAuditCsv(auditLogs);
        triggerDownload(
          new Blob([csv], { type: "text/csv;charset=utf-8" }),
          `audit-trail-${workspace}-demo.csv`
        );
      } else {
        const { blob, fileName } = await exportAuditLogsCsv(workspaceId || "default", {
          sortBy: "timestamp",
        });
        triggerDownload(blob, fileName);
      }
      toast.success("Audit CSV export started");
    } catch (error) {
      console.error("Audit export failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto w-full space-y-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Audit Trail
        </h1>
        {isDemo && (
          <p className="text-sm mt-1">
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              DEMO MODE
            </span>
          </p>
        )}
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Historical record of policy modifications, claims decisions, compliance checks, and user activity logs
        </p>
      </div>

      {/* Error Banner for Real API */}
      {!isDemo && realLogsError && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.12)", color: "var(--danger)", border: "1px solid var(--danger)" }}
        >
          <strong>Error:</strong> {realLogsError?.message || "Failed to load audit logs"}
        </div>
      )}

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
            {!canExport && !isDemo && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Export is available to compliance officers, fraud analysts, auditors, and admins.
              </p>
            )}
          </div>
          <button
            onClick={() => {
              void handleExportCsv();
            }}
            disabled={isExporting || isLoading || !canExport}
            className="btn-primary shrink-0"
            style={{
              textDecoration: "none",
              cursor: isExporting || isLoading || !canExport ? "not-allowed" : "pointer",
              opacity: isExporting || isLoading || !canExport ? 0.7 : 1,
            }}
            title={!canExport ? "Export is available to compliance officers, fraud analysts, auditors, and admins" : undefined}
          >
            {isExporting ? "⏳ Exporting..." : "📥 Export as CSV"}
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
