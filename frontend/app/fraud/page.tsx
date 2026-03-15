"use client";
import { useState } from "react";

/**
 * Fraud Detection page – FR016-FR018
 */

interface Alert {
  id: string;
  claimId: string;
  policyId: string;
  type: string;
  riskScore: number;
  severity: "high" | "medium" | "low";
  date: string;
  description: string;
  status: "under_review" | "resolved" | "dismissed";
}

const MOCK_ALERTS: Alert[] = [
  {
    id: "FRD-001",
    claimId: "CLM-8821",
    policyId: "AUTO-2024-055",
    type: "Duplicate Claim",
    riskScore: 92,
    severity: "high",
    date: "2024-03-14",
    description: "3 identical water damage claims filed within 60 days across different policy numbers linked to the same address.",
    status: "under_review",
  },
  {
    id: "FRD-002",
    claimId: "CLM-8799",
    policyId: "PROP-2023-112",
    type: "Inflated Valuation",
    riskScore: 78,
    severity: "high",
    date: "2024-03-12",
    description: "Claimed replacement value ($85,000) is 340% above assessed market value of damaged property.",
    status: "under_review",
  },
  {
    id: "FRD-003",
    claimId: "CLM-8750",
    policyId: "MED-2024-007",
    type: "Provider Billing Anomaly",
    riskScore: 65,
    severity: "medium",
    date: "2024-03-10",
    description: "Medical provider billed for 28 procedures in a single day for the same patient – statistically improbable.",
    status: "under_review",
  },
  {
    id: "FRD-004",
    claimId: "CLM-8701",
    policyId: "AUTO-2024-031",
    type: "Staged Accident",
    riskScore: 88,
    severity: "high",
    date: "2024-03-08",
    description: "Accident report inconsistencies with third-party witnesses and GPS telemetry data from insured vehicle.",
    status: "under_review",
  },
  {
    id: "FRD-005",
    claimId: "CLM-8640",
    policyId: "BIZ-2023-089",
    type: "Phantom Inventory",
    riskScore: 55,
    severity: "medium",
    date: "2024-03-05",
    description: "Business interruption claim references inventory that does not appear in prior audited financial statements.",
    status: "resolved",
  },
  {
    id: "FRD-006",
    claimId: "CLM-8601",
    policyId: "PROP-2023-088",
    type: "Post-Incident Policy Upgrade",
    riskScore: 40,
    severity: "low",
    date: "2024-03-01",
    description: "Policy coverage was upgraded 3 days before the reported incident date.",
    status: "dismissed",
  },
];

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  high: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)" },
  medium: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)" },
  low: { color: "var(--success)", bg: "rgba(34,197,94,0.12)" },
};

const STATUS_LABELS: Record<string, string> = {
  under_review: "Under Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export default function FraudPage() {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [selected, setSelected] = useState<Alert | null>(null);

  const filtered = filter === "all" ? MOCK_ALERTS : MOCK_ALERTS.filter((a) => a.severity === filter);

  const total = MOCK_ALERTS.length;
  const highCount = MOCK_ALERTS.filter((a) => a.severity === "high").length;
  const underReview = MOCK_ALERTS.filter((a) => a.status === "under_review").length;
  const resolved = MOCK_ALERTS.filter((a) => a.status === "resolved").length;

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Fraud Detection
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          AI-flagged suspicious claims requiring manual review.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Alerts", value: total, color: "var(--text-primary)", bg: "var(--bg-surface)" },
          { label: "High Risk", value: highCount, color: "var(--danger)", bg: "var(--danger-soft)" },
          { label: "Under Review", value: underReview, color: "var(--warning)", bg: "var(--warning-soft)" },
          { label: "Resolved", value: resolved, color: "var(--success)", bg: "var(--success-soft)" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="stat-card flex flex-col gap-2">
            <div className="text-2xl font-bold" style={{ color, letterSpacing: "-0.02em" }}>{value}</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "high", "medium", "low"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={{
              background: filter === s ? "var(--accent-gradient)" : "var(--bg-card)",
              color: filter === s ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${filter === s ? "transparent" : "var(--border)"}`,
              boxShadow: filter === s ? "0 2px 8px rgba(59,130,246,0.25)" : undefined,
            }}
          >
            {s === "all" ? "All Alerts" : s.charAt(0).toUpperCase() + s.slice(1) + " Risk"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              {["Alert ID", "Claim ID", "Type", "Risk Score", "Severity", "Date", "Status", "Actions"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((alert) => {
              const sev = SEVERITY_STYLES[alert.severity];
              return (
                <tr key={alert.id}>
                  <td>
                    <span className="font-mono font-semibold text-sm" style={{ color: "var(--accent)" }}>
                      {alert.id}
                    </span>
                  </td>
                  <td className="font-medium">{alert.claimId}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{alert.type}</td>
                  <td>
                    <span
                      className="font-bold text-sm"
                      style={{
                        color:
                          alert.riskScore > 70
                            ? "var(--danger)"
                            : alert.riskScore > 50
                            ? "var(--warning)"
                            : "var(--success)",
                      }}
                    >
                      {alert.riskScore}
                    </span>
                    <span className="text-xs ml-0.5" style={{ color: "var(--text-muted)" }}>/100</span>
                  </td>
                  <td>
                    <span className="badge" style={{ background: sev.bg, color: sev.color }}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: "var(--text-secondary)" }}>{alert.date}</td>
                  <td className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {STATUS_LABELS[alert.status]}
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelected(alert)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          border: "1px solid rgba(59,130,246,0.2)",
                        }}
                      >
                        View
                      </button>
                      <button
                        className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                        style={{
                          background: "var(--bg-surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="card space-y-4" style={{ borderColor: "rgba(59,130,246,0.3)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Alert Details — <span style={{ color: "var(--accent)" }}>{selected.id}</span>
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="btn-secondary text-xs"
              style={{ padding: "0.3rem 0.75rem" }}
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Claim ID", value: selected.claimId },
              { label: "Policy ID", value: selected.policyId },
              { label: "Type", value: selected.type },
              { label: "Risk Score", value: `${selected.riskScore}/100`, danger: true },
            ].map(({ label, value, danger }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
                <p className="font-semibold text-sm" style={{ color: danger ? "var(--danger)" : "var(--text-primary)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Evidence Summary
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {selected.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
