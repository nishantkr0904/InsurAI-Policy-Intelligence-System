"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import ComplianceReport from "@/components/ComplianceReport";
import { type ComplianceIssue } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { useComplianceIssues } from "@/hooks/useQueries";

/**
 * Compliance Audit page – FR019-FR021
 * Now using TanStack Query for automatic caching and background refetching
 */

const SEV_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", label: "Critical" },
  high: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", label: "High" },
  medium: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)", label: "Medium" },
  low: { color: "var(--accent)", bg: "rgba(37,99,235,0.12)", label: "Low" },
};

const STATUS_STYLES: Record<string, { color: string }> = {
  open: { color: "var(--danger)" },
  acknowledged: { color: "var(--warning)" },
  in_progress: { color: "var(--warning)" },
  resolved: { color: "var(--success)" },
  waived: { color: "var(--text-muted)" },
};

// Score: start at 100, critical = -20, high = -15, medium = -8, low = -2
function calcScore(issues: ComplianceIssue[]) {
  let score = 100;
  for (const issue of issues) {
    if (issue.status === "resolved" || issue.status === "waived") continue;
    if (issue.severity === "critical") score -= 20;
    else if (issue.severity === "high") score -= 15;
    else if (issue.severity === "medium") score -= 8;
    else score -= 2;
  }
  return Math.max(0, score);
}

export default function CompliancePage() {
  const workspaceId = getWorkspaceId();
  const { data, isLoading: loading, error, refetch } = useComplianceIssues(workspaceId);

  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [workspace, setWorkspace] = useState("default");
  const [generating, setGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const issues = data?.issues || [];
  const score = calcScore(issues);
  const openCritical = issues.filter((i) => i.severity === "critical" && i.status !== "resolved").length;

  async function runCheck() {
    setRunning(true);
    setRan(false);
    try {
      await refetch();
      setRan(true);
    } finally {
      setRunning(false);
    }
  }

  async function generateReport() {
    setGenerating(true);
    // Simulate report generation processing
    await new Promise((r) => setTimeout(r, 1200));
    setGenerating(false);
    setShowReport(true);
  }

  const scoreColor =
    score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--danger)";

  return (
    <AuthGuard>
    <div className="px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Compliance Audit
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Automated regulatory compliance checks across your policy workspace.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.12)", color: "var(--danger)", border: "1px solid var(--danger)" }}
        >
          <strong>Error:</strong> {error?.message || "Failed to load compliance issues"}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* Score + Run Check */}
      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Score meter */}
            <div className="card flex flex-col items-center gap-4 py-8">
              <p className="section-title" style={{ marginBottom: 0 }}>Compliance Score</p>
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={scoreColor} strokeWidth="2.5"
                    strokeDasharray={`${score} 100`} strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: scoreColor, letterSpacing: "-0.03em" }}>
                    {score}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>/ 100</span>
                </div>
              </div>
              {openCritical > 0 && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid rgba(248,81,73,0.2)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {openCritical} critical issue{openCritical > 1 ? "s" : ""} need attention
                </div>
              )}
            </div>

            {/* Run check */}
            <div className="card flex flex-col gap-5 justify-between">
              <div>
                <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>
                  Run Compliance Check
                </h3>
                <div className="space-y-1.5">
                  <label className="form-label">Workspace</label>
                  <input
                    className="input"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="default"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={runCheck} className="btn-primary w-full" disabled={running}>
                  {running ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Running checks…
                    </span>
                  ) : "Run Compliance Check →"}
                </button>
                {ran && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--success)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Check complete — {issues.length} issues found
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Issues list */}
          <div>
            <h2 className="section-title">Compliance Issues</h2>
            <div className="space-y-3">
              {issues.map((issue) => {
                const sev = SEV_STYLES[issue.severity];
                const statusStyle = STATUS_STYLES[issue.status];
                return (
                  <div
                    key={issue.issue_id}
                    className="card flex items-start gap-4"
                    style={{ borderLeft: `3px solid ${sev.color}` }}
                  >
                    <span
                      className="badge shrink-0 mt-0.5"
                      style={{ background: sev.bg, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                          {issue.issue_id}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {issue.rule_name}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {issue.description}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold shrink-0 capitalize px-2 py-0.5 rounded-full"
                      style={{
                        color: statusStyle.color,
                        background: `${statusStyle.color}1a`,
                      }}
                    >
                      {issue.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generate Report */}
          <div className="card flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Compliance Report
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Export a full compliance audit report for workspace &quot;{workspace}&quot;
              </p>
            </div>
            <button onClick={generateReport} className="btn-primary shrink-0" disabled={generating}>
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Generating…
                </span>
              ) : "Generate Report →"}
            </button>
          </div>
        </>
      )}

      {/* Compliance Report Modal - FR020 */}
      {showReport && (
        <ComplianceReport
          issues={issues}
          score={score}
          workspace={workspace}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
    </AuthGuard>
  );
}
