"use client";

import { type ComplianceIssue } from "@/lib/api";

interface ComplianceReportProps {
  issues: ComplianceIssue[];
  score: number;
  workspace: string;
  onClose: () => void;
}

/**
 * ComplianceReport - Structured compliance audit report display.
 * Implements FR020 – Compliance Report Generation.
 *
 * Displays:
 * - Executive summary with compliance score
 * - Issues breakdown by severity
 * - Detailed issue list
 * - Recommendations for remediation
 */
export default function ComplianceReport({
  issues,
  score,
  workspace,
  onClose,
}: ComplianceReportProps) {
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const normalizedIssues = issues.map((issue, index) => normalizeIssue(issue, index));

  // Group issues by display severity buckets.
  const criticalIssues = normalizedIssues.filter((i) => i.displaySeverity === "critical");
  const warningIssues = normalizedIssues.filter((i) => i.displaySeverity === "warning");
  const infoIssues = normalizedIssues.filter((i) => i.displaySeverity === "info");

  // Count by status
  const openCount = normalizedIssues.filter((i) => i.status === "open").length;
  const acknowledgedCount = normalizedIssues.filter((i) => i.status === "acknowledged").length;
  const resolvedCount = normalizedIssues.filter((i) => i.status === "resolved").length;

  // Generate recommendations based on issues
  const recommendations = generateRecommendations(normalizedIssues);

  const scoreColor =
    score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--danger)";
  const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Fair" : "Needs Improvement";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Report Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
          }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Compliance Audit Report
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Workspace: {workspace} • Generated: {reportDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close report"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Report Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Executive Summary */}
          <section>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Executive Summary
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className="rounded-lg px-5 py-4"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: `${scoreColor}20`, border: `2px solid ${scoreColor}` }}
                  >
                    <span className="text-2xl font-bold" style={{ color: scoreColor }}>
                      {score}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                      COMPLIANCE SCORE
                    </p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: scoreColor }}>
                      {scoreLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg px-5 py-4 space-y-2"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  ISSUES SUMMARY
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Open</span>
                  <span className="font-bold" style={{ color: "var(--danger)" }}>{openCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Acknowledged</span>
                  <span className="font-bold" style={{ color: "var(--warning)" }}>{acknowledgedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Resolved</span>
                  <span className="font-bold" style={{ color: "var(--success)" }}>{resolvedCount}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Issues Breakdown by Severity */}
          <section>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Issues Breakdown
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div
                className="rounded-lg px-4 py-3"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
                    Critical
                  </span>
                  <span className="text-2xl font-bold" style={{ color: "var(--danger)" }}>
                    {criticalIssues.length}
                  </span>
                </div>
              </div>
              <div
                className="rounded-lg px-4 py-3"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--warning)" }}>
                    Warning
                  </span>
                  <span className="text-2xl font-bold" style={{ color: "var(--warning)" }}>
                    {warningIssues.length}
                  </span>
                </div>
              </div>
              <div
                className="rounded-lg px-4 py-3"
                style={{
                  background: "rgba(37,99,235,0.08)",
                  border: "1px solid rgba(37,99,235,0.2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    Info
                  </span>
                  <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                    {infoIssues.length}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Issues */}
          {criticalIssues.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--danger)" }}>
                Critical Issues
              </h3>
              <div className="space-y-3">
                {criticalIssues.map((issue) => (
                  <IssueCard key={issue.key} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {warningIssues.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--warning)" }}>
                Warnings
              </h3>
              <div className="space-y-3">
                {warningIssues.map((issue) => (
                  <IssueCard key={issue.key} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {infoIssues.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--accent)" }}>
                Informational
              </h3>
              <div className="space-y-3">
                {infoIssues.map((issue) => (
                  <IssueCard key={issue.key} issue={issue} />
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Recommendations
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg px-4 py-3 flex items-start gap-3"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      <span className="font-bold text-sm">{idx + 1}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <p>
              This report was automatically generated on {reportDate} for workspace &quot;{workspace}&quot;.
              The compliance score is calculated based on the severity and status of detected issues.
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div
          className="sticky bottom-0 px-6 py-4 border-t"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
          }}
        >
          <button onClick={onClose} className="btn-primary w-full">
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * IssueCard - Individual issue display in the report
 */
function IssueCard({ issue }: { issue: ComplianceIssue }) {
  const sevColors = {
    critical: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)" },
    warning: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)" },
    info: { color: "var(--accent)", bg: "rgba(37,99,235,0.12)" },
  };
  const normalizedIssue = normalizeIssue(issue);
  const sev = sevColors[normalizedIssue.displaySeverity];

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ background: "var(--bg-surface)", border: `1px solid ${sev.color}40` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="badge shrink-0"
          style={{ background: sev.bg, color: sev.color }}
        >
          {normalizedIssue.issueId}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
            {normalizedIssue.ruleName}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {issue.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{
                background: issue.status === "resolved" ? "var(--success-soft)" : "var(--border)",
                color: issue.status === "resolved" ? "var(--success)" : "var(--text-muted)",
              }}
            >
              {issue.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate actionable recommendations based on detected issues
 */
function generateRecommendations(issues: ComplianceIssue[]): string[] {
  const recommendations: string[] = [];
  const criticalCount = issues.filter((i) => i.severity === "critical" && i.status !== "resolved").length;
  const openCount = issues.filter((i) => i.status === "open").length;

  if (criticalCount > 0) {
    recommendations.push(
      `Address ${criticalCount} critical ${criticalCount === 1 ? "issue" : "issues"} immediately to avoid regulatory penalties and ensure compliance with industry standards.`
    );
  }

  if (openCount > 5) {
    recommendations.push(
      "Prioritize open issues by severity and assign ownership to ensure timely resolution. Consider establishing a compliance task force for systematic remediation."
    );
  }

  // Add specific recommendations based on issue types
  const uniqueRules = new Set(
    issues
      .filter((i) => i.status !== "resolved")
      .map((i) => normalizeIssue(i).ruleName)
  );

  if (uniqueRules.size > 0) {
    recommendations.push(
      "Review and update policy documents to ensure alignment with current regulatory requirements. Implement automated compliance monitoring for continuous oversight."
    );
  }

  if (issues.some((i) => i.status === "acknowledged")) {
    recommendations.push(
      "Follow up on acknowledged issues to track remediation progress. Set deadlines for resolution and assign clear action items to responsible parties."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Maintain current compliance standards through regular audits and monitoring. Continue reviewing policy documents for alignment with evolving regulations."
    );
  }

  return recommendations;
}

function normalizeIssue(issue: ComplianceIssue, index = 0) {
  const issueId = issue.issue_id || `ISSUE-${index}`;
  const ruleName = issue.rule_name || "Compliance rule";

  let displaySeverity: "critical" | "warning" | "info" = "info";
  if (issue.severity === "critical") displaySeverity = "critical";
  else if (issue.severity === "high" || issue.severity === "medium") displaySeverity = "warning";

  return {
    ...issue,
    key: `${issueId}-${issue.detected_date || index}`,
    issueId,
    ruleName,
    displaySeverity,
  };
}
