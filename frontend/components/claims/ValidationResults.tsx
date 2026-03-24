"use client";

export interface ValidationResult {
  claim_id: string;
  approval_status: "approved" | "approved_with_conditions" | "denied" | "requires_review";
  risk_score: number;
  severity: "low" | "medium" | "high" | "critical";
  referenced_clauses: Array<{
    clause_id: string;
    title: string;
    page: number;
    snippet?: string;
  }>;
  confidence_score: number;
  reasoning: string;
  next_steps: string[];
  conditions?: string[];
  exclusions?: string[];
}

interface ValidationResultsProps {
  result: ValidationResult;
  onViewClause?: (clauseId: string, page: number) => void;
  onQueryPolicy?: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  approved: {
    bg: "rgba(34,197,94,0.15)",
    color: "var(--success)",
    label: "Approved",
    icon: "M5 13l4 4L19 7",
  },
  approved_with_conditions: {
    bg: "rgba(245,158,11,0.15)",
    color: "var(--warning)",
    label: "Approved with Conditions",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  denied: {
    bg: "rgba(239,68,68,0.15)",
    color: "var(--danger)",
    label: "Denied",
    icon: "M6 18L18 6M6 6l12 12",
  },
  requires_review: {
    bg: "rgba(59,130,246,0.15)",
    color: "var(--accent)",
    label: "Requires Review",
    icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01",
  },
};

const CONFIDENCE_STYLES = {
  high: { color: "var(--success)", label: "High Confidence", threshold: 0.85 },
  medium: { color: "var(--warning)", label: "Medium Confidence", threshold: 0.65 },
  low: { color: "var(--danger)", label: "Low Confidence", threshold: 0 },
};

function getConfidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.85) return "high";
  if (score >= 0.65) return "medium";
  return "low";
}

export default function ValidationResults({
  result,
  onViewClause,
  onQueryPolicy,
}: ValidationResultsProps) {
  const statusStyle = STATUS_STYLES[result.approval_status];
  const confidenceLevel = getConfidenceLevel(result.confidence_score);
  const confidenceStyle = CONFIDENCE_STYLES[confidenceLevel];

  return (
    <div className="space-y-5">
      {/* Status Header */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: statusStyle.bg }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={statusStyle.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={statusStyle.icon} />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {statusStyle.label}
              </h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Claim {result.claim_id}
              </p>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="text-right">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: confidenceStyle.color }}
              />
              <span className="text-sm font-medium" style={{ color: confidenceStyle.color }}>
                {confidenceStyle.label}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {(result.confidence_score * 100).toFixed(0)}% confidence
            </p>
          </div>
        </div>

        {/* Low Confidence Warning */}
        {confidenceLevel === "low" && (
          <div
            className="flex items-start gap-3 p-3 rounded-lg mb-4"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--danger)"
              strokeWidth="2"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
                Manual Review Required
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Confidence score is below threshold. Please review carefully before making a decision.
              </p>
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="mb-4">
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
            AI Analysis
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {result.reasoning}
          </p>
        </div>

        {/* Risk Score Gauge */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Risk Score
              </span>
              <span
                className="text-sm font-bold"
                style={{
                  color:
                    result.risk_score >= 70
                      ? "var(--danger)"
                      : result.risk_score >= 40
                        ? "var(--warning)"
                        : "var(--success)",
                }}
              >
                {result.risk_score}/100
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${result.risk_score}%`,
                  background:
                    result.risk_score >= 70
                      ? "var(--danger)"
                      : result.risk_score >= 40
                        ? "var(--warning)"
                        : "var(--success)",
                }}
              />
            </div>
          </div>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background:
                result.severity === "critical"
                  ? "rgba(239,68,68,0.15)"
                  : result.severity === "high"
                    ? "rgba(245,158,11,0.15)"
                    : result.severity === "medium"
                      ? "rgba(59,130,246,0.15)"
                      : "rgba(34,197,94,0.15)",
              color:
                result.severity === "critical"
                  ? "var(--danger)"
                  : result.severity === "high"
                    ? "var(--warning)"
                    : result.severity === "medium"
                      ? "var(--accent)"
                      : "var(--success)",
            }}
          >
            {result.severity.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Conditions (if approved with conditions) */}
      {result.conditions && result.conditions.length > 0 && (
        <div className="card p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--warning)" }}>
            Conditions for Approval
          </h4>
          <ul className="space-y-2">
            {result.conditions.map((condition, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: "var(--warning)" }}>&bull;</span>
                <span style={{ color: "var(--text-secondary)" }}>{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Referenced Clauses */}
      {result.referenced_clauses.length > 0 && (
        <div className="card p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Referenced Policy Clauses
          </h4>
          <div className="space-y-2">
            {result.referenced_clauses.map((clause) => (
              <div
                key={clause.clause_id}
                className="p-3 rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                onClick={() => onViewClause?.(clause.clause_id, clause.page)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: "var(--accent)" }}>
                    {clause.clause_id}: {clause.title}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Page {clause.page}
                  </span>
                </div>
                {clause.snippet && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    &ldquo;{clause.snippet}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {result.next_steps.length > 0 && (
        <div className="card p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Recommended Next Steps
          </h4>
          <ol className="space-y-2">
            {result.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {i + 1}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Action Button */}
      {onQueryPolicy && (
        <button
          onClick={onQueryPolicy}
          className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          Ask follow-up questions about this policy &rarr;
        </button>
      )}
    </div>
  );
}
