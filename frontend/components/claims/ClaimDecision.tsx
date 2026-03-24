"use client";
import { useState } from "react";
import type { ValidationResult } from "./ValidationResults";

interface ClaimDecisionProps {
  claimId: string;
  aiRecommendation: ValidationResult["approval_status"];
  claimAmount: number;
  onDecisionSubmit: (decision: ClaimDecision) => void;
  isSubmitting?: boolean;
}

export interface ClaimDecision {
  claim_id: string;
  decision: "approved" | "approved_with_conditions" | "rejected" | "escalated";
  adjuster_notes: string;
  override_reason?: string;
  is_override: boolean;
  timestamp: string;
}

const DECISION_OPTIONS = [
  {
    value: "approved",
    label: "Approve",
    description: "Approve claim for full payout",
    color: "var(--success)",
    bg: "rgba(34,197,94,0.15)",
  },
  {
    value: "approved_with_conditions",
    label: "Approve with Conditions",
    description: "Approve with specific conditions or deductibles",
    color: "var(--warning)",
    bg: "rgba(245,158,11,0.15)",
  },
  {
    value: "rejected",
    label: "Reject",
    description: "Deny claim based on policy terms",
    color: "var(--danger)",
    bg: "rgba(239,68,68,0.15)",
  },
  {
    value: "escalated",
    label: "Escalate",
    description: "Send to senior adjuster or supervisor",
    color: "var(--accent)",
    bg: "rgba(59,130,246,0.15)",
  },
] as const;

function mapAiStatus(status: ValidationResult["approval_status"]): ClaimDecision["decision"] {
  if (status === "denied") return "rejected";
  if (status === "requires_review") return "escalated";
  return status as ClaimDecision["decision"];
}

export default function ClaimDecision({
  claimId,
  aiRecommendation,
  claimAmount,
  onDecisionSubmit,
  isSubmitting = false,
}: ClaimDecisionProps) {
  const aiDecision = mapAiStatus(aiRecommendation);
  const [decision, setDecision] = useState<ClaimDecision["decision"]>(aiDecision);
  const [notes, setNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [confirmOverride, setConfirmOverride] = useState(false);

  const isOverride = decision !== aiDecision;
  const isHighValue = claimAmount > 25000;
  const requiresOverrideConfirmation = isOverride && !confirmOverride;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (requiresOverrideConfirmation) {
      return;
    }

    const decisionData: ClaimDecision = {
      claim_id: claimId,
      decision,
      adjuster_notes: notes,
      override_reason: isOverride ? overrideReason : undefined,
      is_override: isOverride,
      timestamp: new Date().toISOString(),
    };

    onDecisionSubmit(decisionData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* AI Recommendation Banner */}
      <div
        className="p-4 rounded-lg"
        style={{
          background: DECISION_OPTIONS.find((o) => o.value === aiDecision)?.bg,
          border: `1px solid ${DECISION_OPTIONS.find((o) => o.value === aiDecision)?.color}`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: DECISION_OPTIONS.find((o) => o.value === aiDecision)?.color }}
          >
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            AI Recommendation
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Based on policy analysis, the AI recommends:{" "}
          <strong style={{ color: DECISION_OPTIONS.find((o) => o.value === aiDecision)?.color }}>
            {DECISION_OPTIONS.find((o) => o.value === aiDecision)?.label}
          </strong>
        </p>
      </div>

      {/* Decision Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Your Decision
        </label>
        <div className="grid grid-cols-2 gap-3">
          {DECISION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setDecision(option.value);
                if (option.value === aiDecision) {
                  setConfirmOverride(false);
                  setOverrideReason("");
                }
              }}
              className="p-3 rounded-lg text-left transition-all"
              style={{
                background: decision === option.value ? option.bg : "var(--bg-surface)",
                border: `2px solid ${decision === option.value ? option.color : "var(--border)"}`,
              }}
            >
              <span
                className="text-sm font-medium block"
                style={{ color: decision === option.value ? option.color : "var(--text-primary)" }}
              >
                {option.label}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Override Warning */}
      {isOverride && (
        <div
          className="p-4 rounded-lg space-y-3"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid var(--warning)" }}
        >
          <div className="flex items-start gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--warning)"
              strokeWidth="2"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--warning)" }}>
                Override AI Recommendation
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Your decision differs from the AI recommendation. Please provide justification.
                {isHighValue && " Manager notification will be sent for high-value claims."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Override Justification (Required)
            </label>
            <textarea
              className="input w-full"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why you are overriding the AI recommendation..."
              required={isOverride}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmOverride}
              onChange={(e) => setConfirmOverride(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              I confirm this override will be logged for audit purposes
            </span>
          </label>
        </div>
      )}

      {/* Adjuster Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Adjuster Notes
        </label>
        <textarea
          className="input w-full"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes or observations about this claim..."
        />
      </div>

      {/* High Value Warning */}
      {isHighValue && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg text-sm"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
          >
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ color: "var(--text-secondary)" }}>
            <strong>High-value claim:</strong> ${claimAmount.toLocaleString()} - Decision will require supervisor review
          </span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isSubmitting || (isOverride && (!overrideReason || !confirmOverride))}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Submitting Decision...
          </span>
        ) : (
          `Submit ${DECISION_OPTIONS.find((o) => o.value === decision)?.label} Decision`
        )}
      </button>

      {/* Audit Notice */}
      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        This decision will be logged to the audit trail (FR021, FR028)
      </p>
    </form>
  );
}
