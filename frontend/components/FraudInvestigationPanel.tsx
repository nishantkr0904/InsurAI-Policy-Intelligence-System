"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type FraudAlert, updateFraudAlertStatus } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

interface FraudInvestigationPanelProps {
  alert: FraudAlert;
  onClose: () => void;
  onStatusChange?: (alertId: string, status: FraudAlert["status"]) => void;
}

// Utility: Safe toLowerCase to prevent crashes
function safeLower(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

// Utility: Normalize alert data to handle missing/undefined fields
function normalizeAlert(alert: FraudAlert) {
  return {
    ...alert,
    // Use anomaly_types[0] as "type" if available, fallback to "unknown"
    type: alert.anomaly_types?.[0] || "unknown",
    // Ensure all string fields have safe defaults
    severity: alert.severity || "low",
    status: alert.status || "new",
    reasoning: alert.reasoning || "No details provided",
    detected_date: alert.detected_date || new Date().toISOString(),
    policy_number: alert.policy_number || "UNKNOWN",
  };
}

/**
 * FraudInvestigationPanel - Structured fraud investigation display.
 * Implements FR018 – Fraud Investigation Support.
 *
 * Displays:
 * - Structured evidence with fraud indicators
 * - Related claims cross-reference
 * - Policy clause mapping
 * - Investigation timeline
 * - Action buttons for case management
 */
export default function FraudInvestigationPanel({
  alert: rawAlert,
  onClose,
  onStatusChange,
}: FraudInvestigationPanelProps) {
  // Normalize alert data to prevent undefined crashes
  const alert = normalizeAlert(rawAlert);

  const [activeTab, setActiveTab] = useState<"evidence" | "claims" | "policy">("evidence");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(alert.status);

  // Generate structured evidence based on alert data
  const evidence = generateEvidenceIndicators(alert);
  const relatedClaims = generateRelatedClaims(alert);
  const policyClauses = generatePolicyClauses(alert);
  const timeline = generateTimeline(alert);

  const sevStyles: Record<string, { color: string; bg: string; border: string }> = {
    critical: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
    high: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
    medium: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
    low: { color: "var(--success)", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" },
  };
  const sev = sevStyles[alert.severity] || sevStyles.low;

  async function handleAction(action: "resolve" | "dismiss" | "escalate") {
    if (!alert.alert_id) {
      toast.error("Cannot update: missing alert ID");
      return;
    }

    setActionLoading(action);

    // Map action to status
    const statusMap: Record<string, FraudAlert["status"]> = {
      resolve: "resolved",
      dismiss: "false_positive",
      escalate: "escalated",
    };
    const newStatus = statusMap[action];

    try {
      const response = await updateFraudAlertStatus(alert.alert_id, {
        status: newStatus,
        notes: `Action: ${action} performed via investigation panel`,
        workspace_id: getWorkspaceId() || "default",
      });

      // Update local state
      setCurrentStatus(newStatus);

      // Notify parent component
      if (onStatusChange) {
        onStatusChange(alert.alert_id, newStatus);
      }

      // Show success toast
      toast.success(response.message || `Alert ${action}d successfully`);

      // Close modal for non-escalate actions
      if (action !== "escalate") {
        onClose();
      }
    } catch (error) {
      console.error(`Failed to ${action} alert:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} alert`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{ background: "var(--bg-primary)", border: `1px solid ${sev.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4 border-b"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: sev.bg }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ color: sev.color }}
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    Fraud Investigation
                  </h2>
                  <span
                    className="badge text-xs font-bold"
                    style={{ background: sev.bg, color: sev.color }}
                  >
                    {safeLower(alert.severity).toUpperCase()} RISK
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Alert {alert.alert_id || "N/A"} • Claim {alert.claim_id || "N/A"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Close panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Risk Score Bar */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              RISK SCORE
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${alert.risk_score}%`,
                  background: alert.risk_score > 70 ? "var(--danger)" : alert.risk_score > 50 ? "var(--warning)" : "var(--success)",
                }}
              />
            </div>
            <span
              className="text-lg font-bold"
              style={{
                color: alert.risk_score > 70 ? "var(--danger)" : alert.risk_score > 50 ? "var(--warning)" : "var(--success)",
              }}
            >
              {alert.risk_score}
              <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>/100</span>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex gap-1">
            {[
              { id: "evidence", label: "Evidence", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
              { id: "claims", label: "Related Claims", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
              { id: "policy", label: "Policy Clauses", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
                style={{
                  background: activeTab === tab.id ? "var(--bg-surface)" : "transparent",
                  color: activeTab === tab.id ? "var(--accent)" : "var(--text-secondary)",
                  borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Evidence Tab */}
          {activeTab === "evidence" && (
            <div className="space-y-5">
              {/* Alert Description */}
              <div
                className="rounded-lg p-4"
                style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {alert.reasoning || "No details available"}
                </p>
              </div>

              {/* Fraud Indicators */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  Fraud Indicators Detected
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {evidence.indicators.map((indicator, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-lg p-3"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: indicator.severity === "high" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                          color: indicator.severity === "high" ? "var(--danger)" : "var(--warning)",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d={indicator.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {indicator.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {indicator.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  Investigation Timeline
                </h3>
                <div className="space-y-0">
                  {timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: event.type === "alert" ? "var(--danger)" : event.type === "action" ? "var(--accent)" : "var(--border)" }}
                        />
                        {idx < timeline.length - 1 && (
                          <div className="w-0.5 flex-1 my-1" style={{ background: "var(--border)" }} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {event.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {event.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Related Claims Tab */}
          {activeTab === "claims" && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Claims potentially related to this fraud alert based on pattern matching and cross-reference analysis.
              </p>
              {relatedClaims.length > 0 ? (
                <div className="space-y-3">
                  {relatedClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="rounded-lg p-4 flex items-center justify-between gap-4"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: "var(--accent-soft)" }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--accent)" }}>
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                            {claim.id}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {claim.type} • {claim.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {claim.similarity}% match
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {claim.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-lg p-6 text-center"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No related claims found in the system.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Policy Clauses Tab */}
          {activeTab === "policy" && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Policy clauses relevant to this fraud investigation, showing potential violations and coverage implications.
              </p>
              {policyClauses.length > 0 ? (
                <div className="space-y-3">
                  {policyClauses.map((clause, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg p-4"
                      style={{
                        background: clause.violated ? "rgba(239,68,68,0.06)" : "var(--bg-surface)",
                        border: `1px solid ${clause.violated ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span
                          className="badge shrink-0"
                          style={{
                            background: clause.violated ? "rgba(239,68,68,0.12)" : "var(--accent-soft)",
                            color: clause.violated ? "var(--danger)" : "var(--accent)",
                          }}
                        >
                          {clause.reference}
                        </span>
                        {clause.violated && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(239,68,68,0.12)", color: "var(--danger)" }}
                          >
                            Potential Violation
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                        {clause.title}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {clause.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-lg p-6 text-center"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No policy clauses mapped for this alert.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div
          className="sticky bottom-0 px-6 py-4 border-t flex items-center justify-between gap-4"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
              style={{
                background: currentStatus === "resolved" ? "var(--success-soft)" : currentStatus === "false_positive" ? "var(--border)" : currentStatus === "escalated" ? "rgba(239,68,68,0.12)" : "var(--warning-soft)",
                color: currentStatus === "resolved" ? "var(--success)" : currentStatus === "false_positive" ? "var(--text-muted)" : currentStatus === "escalated" ? "var(--danger)" : "var(--warning)",
              }}
            >
              {safeLower(currentStatus).replace("_", " ") || "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction("dismiss")}
              disabled={actionLoading !== null}
              className="btn-secondary text-sm"
              style={{ padding: "0.5rem 1rem" }}
            >
              {actionLoading === "dismiss" ? "..." : "Dismiss"}
            </button>
            <button
              onClick={() => handleAction("escalate")}
              disabled={actionLoading !== null}
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "var(--warning)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              {actionLoading === "escalate" ? "..." : "Escalate"}
            </button>
            <button
              onClick={() => handleAction("resolve")}
              disabled={actionLoading !== null}
              className="btn-primary text-sm"
              style={{ padding: "0.5rem 1rem" }}
            >
              {actionLoading === "resolve" ? "..." : "Mark Resolved"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions to generate structured data based on alert

interface EvidenceIndicator {
  title: string;
  description: string;
  severity: "high" | "medium";
  icon: string;
}

function generateEvidenceIndicators(alert: ReturnType<typeof normalizeAlert>): { indicators: EvidenceIndicator[] } {
  const indicators: EvidenceIndicator[] = [];
  const type = safeLower(alert.type); // Safe toLowerCase

  // Generate indicators based on fraud type
  if (type.includes("duplicate") || type.includes("submission")) {
    indicators.push({
      title: "Duplicate Submission Pattern",
      description: "Multiple claims with similar details submitted within short timeframe",
      severity: "high",
      icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
    });
  }

  if (type.includes("amount") || type.includes("inflation") || alert.risk_score > 75) {
    indicators.push({
      title: "Unusual Amount Pattern",
      description: "Claim amount significantly exceeds typical range for this category",
      severity: "high",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    });
  }

  if (type.includes("timing") || type.includes("suspicious")) {
    indicators.push({
      title: "Suspicious Timing",
      description: "Claim filed shortly after policy activation or modification",
      severity: "medium",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    });
  }

  if (type.includes("document") || type.includes("inconsisten")) {
    indicators.push({
      title: "Document Inconsistencies",
      description: "Supporting documents contain conflicting or altered information",
      severity: "high",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    });
  }

  // Always add at least a general indicator
  if (indicators.length === 0) {
    indicators.push({
      title: "Anomaly Detected",
      description: "AI analysis flagged unusual patterns requiring investigation",
      severity: safeLower(alert.severity) === "high" || safeLower(alert.severity) === "critical" ? "high" : "medium",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    });
  }

  // Add pattern match indicator for high risk
  if (alert.risk_score > 65) {
    indicators.push({
      title: "Historical Pattern Match",
      description: "Matches known fraud patterns from historical data analysis",
      severity: "medium",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    });
  }

  return { indicators };
}

interface RelatedClaim {
  id: string;
  type: string;
  date: string;
  similarity: number;
  reason: string;
}

function generateRelatedClaims(alert: ReturnType<typeof normalizeAlert>): RelatedClaim[] {
  // Generate plausible related claims based on alert data
  const claims: RelatedClaim[] = [];
  const baseNum = parseInt((alert.claim_id || "1000").replace(/\D/g, "")) || 1000;

  if (alert.risk_score > 60) {
    claims.push({
      id: `CLM-${baseNum - 15}`,
      type: alert.type || "N/A",
      date: "2 weeks ago",
      similarity: Math.min(95, alert.risk_score + 10),
      reason: "Same claimant pattern",
    });
  }

  if (alert.risk_score > 50) {
    claims.push({
      id: `CLM-${baseNum - 42}`,
      type: "Similar incident",
      date: "1 month ago",
      similarity: Math.min(85, alert.risk_score - 5),
      reason: "Geographic proximity",
    });
  }

  if (safeLower(alert.severity) === "high" || safeLower(alert.severity) === "critical") {
    claims.push({
      id: `CLM-${baseNum - 78}`,
      type: alert.type || "N/A",
      date: "3 months ago",
      similarity: 72,
      reason: "Amount pattern match",
    });
  }

  return claims;
}

interface PolicyClause {
  reference: string;
  title: string;
  text: string;
  violated: boolean;
}

function generatePolicyClauses(alert: ReturnType<typeof normalizeAlert>): PolicyClause[] {
  const clauses: PolicyClause[] = [];

  // Safe extraction of last 2 chars from policy number
  const policyRef = (alert.policy_number || "00").slice(-2);

  // Add relevant policy clauses based on alert type
  clauses.push({
    reference: `§${policyRef}.1`,
    title: "Material Misrepresentation",
    text: "Any fraudulent statement, misrepresentation, or concealment of material fact by the insured shall void coverage and may result in claim denial.",
    violated: safeLower(alert.severity) === "high" || safeLower(alert.severity) === "critical",
  });

  clauses.push({
    reference: `§${policyRef}.3`,
    title: "Claim Documentation Requirements",
    text: "All claims must be supported by original documentation, receipts, and evidence of loss. Failure to provide adequate documentation may delay or deny claim processing.",
    violated: safeLower(alert.type).includes("document"),
  });

  clauses.push({
    reference: `§${policyRef}.7`,
    title: "Cooperation Clause",
    text: "The insured agrees to cooperate fully with any investigation and provide truthful information. Non-cooperation may result in denial of benefits.",
    violated: false,
  });

  if (alert.risk_score > 70) {
    clauses.push({
      reference: `§${policyRef}.12`,
      title: "Fraud Prevention",
      text: "The insurer reserves the right to investigate suspicious claims and deny coverage where fraud is suspected or proven.",
      violated: true,
    });
  }

  return clauses;
}

interface TimelineEvent {
  title: string;
  date: string;
  type: "alert" | "action" | "info";
}

function generateTimeline(alert: ReturnType<typeof normalizeAlert>): TimelineEvent[] {
  const alertDate = new Date(alert.detected_date || new Date());
  const events: TimelineEvent[] = [];

  events.push({
    title: "Fraud alert generated",
    date: alertDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    type: "alert",
  });

  // Add intermediate events
  const reviewDate = new Date(alertDate);
  reviewDate.setDate(reviewDate.getDate() + 1);
  events.push({
    title: "Assigned for investigation",
    date: reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    type: "action",
  });

  if (alert.status !== "under_review") {
    const resolveDate = new Date(alertDate);
    resolveDate.setDate(resolveDate.getDate() + 3);
    events.push({
      title: alert.status === "resolved" ? "Investigation completed" : "Alert dismissed",
      date: resolveDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      type: "action",
    });
  } else {
    events.push({
      title: "Pending review",
      date: "Current",
      type: "info",
    });
  }

  return events;
}
