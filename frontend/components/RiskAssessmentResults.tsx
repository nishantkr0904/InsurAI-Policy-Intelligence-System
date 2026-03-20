"use client";

import React from "react";
import type { RiskAssessmentResponse } from "@/lib/api";

interface RiskAssessmentResultsProps {
  result: RiskAssessmentResponse;
  onNewAssessment: () => void;
}

export default function RiskAssessmentResults({ result, onNewAssessment }: RiskAssessmentResultsProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "var(--success)";
      case "medium":
        return "var(--warning)";
      case "high":
        return "var(--danger)";
      case "critical":
        return "var(--danger)";
      default:
        return "var(--text-secondary)";
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case "low":
        return "var(--success-soft)";
      case "medium":
        return "var(--warning-soft)";
      case "high":
        return "var(--danger-soft)";
      case "critical":
        return "var(--danger-soft)";
      default:
        return "var(--bg-surface)";
    }
  };

  const premiumColor = result.premium_adjustment < 0 ? "var(--success)" : "var(--danger)";

  return (
    <div className="space-y-6">
      {/* ── Overall Risk Assessment ─────────────────────────– */}
      <div
        className="rounded-lg p-6"
        style={{
          background: getRiskBg(result.risk_level),
          border: `2px solid ${getRiskColor(result.risk_level)}`,
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: getRiskColor(result.risk_level) }}>
              RISK ASSESSMENT RESULT
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: getRiskColor(result.risk_level) }}>
                  {result.risk_score}
                </span>
                <span className="text-sm" style={{ color: getRiskColor(result.risk_level) }}>
                  / 100
                </span>
              </div>
              <span
                className="inline-block px-3 py-1 rounded-lg text-sm font-bold text-white"
                style={{ background: getRiskColor(result.risk_level) }}
              >
                {result.risk_level.toUpperCase()} RISK
              </span>
            </div>
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-medium mb-2" style={{ color: getRiskColor(result.risk_level) }}>
              PREMIUM ADJUSTMENT
            </p>
            <div className="text-3xl font-bold" style={{ color: premiumColor }}>
              {result.premium_adjustment > 0 ? "+" : ""}
              {result.premium_adjustment}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Underwriting Recommendation ──────────────────────– */}
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Underwriting Recommendation
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {result.underwriting_recommendation}
        </p>
      </div>

      {/* ── Key Risk Factors ────────────────────────────────– */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Key Risk Factors
        </h3>
        <div className="space-y-2">
          {result.key_risk_factors.length > 0 ? (
            result.key_risk_factors.map((factor, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span className="text-lg mt-0.5">⚠️</span>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {factor}
                </span>
              </div>
            ))
          ) : (
            <div
              className="p-3 rounded-lg text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No significant risk factors identified
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mitigation Strategies ───────────────────────────– */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Recommended Mitigation Strategies
        </h3>
        <div className="space-y-2">
          {result.mitigation_strategies.map((strategy, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <span className="text-lg mt-0.5">✓</span>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {strategy}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Review Schedule ─────────────────────────────────– */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              NEXT REVIEW DATE
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
              {new Date(result.next_review_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span className="text-3xl">📅</span>
        </div>
      </div>

      {/* ── Export & Actions ────────────────────────────────– */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onNewAssessment}
          className="btn-secondary w-full text-sm font-semibold"
          style={{ textDecoration: "none" }}
        >
          ← New Assessment
        </button>
        <button
          className="btn-primary w-full text-sm font-semibold"
          style={{ textDecoration: "none", cursor: "pointer" }}
        >
          📥 Export Report
        </button>
      </div>

      {/* ── Disclaimer ──────────────────────────────────────– */}
      <div
        className="rounded-lg px-4 py-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--warning)" }}>Disclaimer:</strong> This risk assessment is generated by AI and is
          informational only. It does not constitute underwriting advice or a final underwriting decision. Always
          supplement with manual review and verify against original policy documents.
        </p>
      </div>
    </div>
  );
}
