"use client";

import { useState } from "react";
import { performRiskAssessment, type RiskAssessmentRequest, type RiskAssessmentResponse } from "@/lib/api";
import { toast } from "sonner";

interface RiskAssessmentPanelProps {
  workspaceId: string;
  isDemo: boolean;
}

// Mock demo response
const DEMO_ASSESSMENT: RiskAssessmentResponse = {
  risk_score: 68,
  risk_level: "high",
  underwriting_recommendation: "Proceed with caution. Consider increased premium or additional coverage restrictions.",
  key_risk_factors: [
    "High claim frequency (3 claims in past 2 years)",
    "Property located in flood-prone zone (Tier 3)",
    "Coverage amount exceeds typical range for property type",
    "Recent natural disaster activity in region",
  ],
  mitigation_strategies: [
    "Require flood mitigation improvements",
    "Install water damage monitoring system",
    "Increase deductible to $2,500",
    "Annual property inspection mandatory",
  ],
  premium_adjustment: 18.5,
  next_review_date: "2024-09-01",
};

export default function RiskAssessmentPanel({ workspaceId, isDemo }: RiskAssessmentPanelProps) {
  const [formData, setFormData] = useState<Partial<RiskAssessmentRequest>>({
    policy_id: "",
    policy_type: "home",
    coverage_amount: 250000,
    deductible: 1000,
    insured_value: 300000,
    location_risk_tier: "medium",
    claim_history: 0,
  });
  const [assessment, setAssessment] = useState<RiskAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideDecision, setOverrideDecision] = useState<"approve" | "reject" | "">("");

  async function handleAssess() {
    if (!formData.policy_id?.trim()) {
      toast.error("Policy ID is required");
      return;
    }

    setLoading(true);
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1500));
        setAssessment(DEMO_ASSESSMENT);
        toast.success("Risk assessment completed");
      } else {
        const result = await performRiskAssessment({
          ...formData,
          workspace_id: workspaceId,
        } as RiskAssessmentRequest);
        setAssessment(result);
        toast.success("Risk assessment completed");
      }
    } catch (error) {
      console.error("Assessment failed:", error);
      toast.error("Failed to perform risk assessment");
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride() {
    if (!overrideDecision || !overrideReason.trim()) {
      toast.error("Please provide decision and justification");
      return;
    }

    try {
      // Log override to audit trail
      if (!isDemo) {
        await fetch("/api/v1/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaceId,
            action: "risk_assessment_override",
            details: {
              policy_id: formData.policy_id,
              original_decision: assessment?.risk_level,
              override_decision: overrideDecision,
              justification: overrideReason,
            },
          }),
        });
      }

      toast.success(`Override recorded: ${overrideDecision}`);
      setShowOverride(false);
      setOverrideReason("");
      setOverrideDecision("");
    } catch (error) {
      console.error("Override failed:", error);
      toast.error("Failed to record override");
    }
  }

  function getRiskColor(level: string) {
    switch (level) {
      case "low": return { color: "var(--success)", bg: "var(--success-soft)" };
      case "medium": return { color: "var(--warning)", bg: "var(--warning-soft)" };
      case "high": return { color: "var(--danger)", bg: "var(--danger-soft)" };
      case "critical": return { color: "var(--danger)", bg: "var(--danger-soft)" };
      default: return { color: "var(--text-muted)", bg: "var(--bg-surface)" };
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Risk Assessment
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Evaluate policy risk and get underwriting recommendations
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Assessment Form */}
        <div
          className="col-span-2 rounded-lg p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Policy Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Policy ID *</label>
              <input
                type="text"
                className="input"
                value={formData.policy_id}
                onChange={(e) => setFormData({ ...formData, policy_id: e.target.value })}
                placeholder="POL-2024-001"
              />
            </div>

            <div>
              <label className="form-label">Policy Type</label>
              <select
                className="input"
                value={formData.policy_type}
                onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
              >
                <option value="home">Home</option>
                <option value="auto">Auto</option>
                <option value="life">Life</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="form-label">Coverage Amount ($)</label>
              <input
                type="number"
                className="input"
                value={formData.coverage_amount}
                onChange={(e) => setFormData({ ...formData, coverage_amount: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="form-label">Deductible ($)</label>
              <input
                type="number"
                className="input"
                value={formData.deductible}
                onChange={(e) => setFormData({ ...formData, deductible: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="form-label">Insured Value ($)</label>
              <input
                type="number"
                className="input"
                value={formData.insured_value}
                onChange={(e) => setFormData({ ...formData, insured_value: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="form-label">Location Risk Tier</label>
              <select
                className="input"
                value={formData.location_risk_tier}
                onChange={(e) => setFormData({ ...formData, location_risk_tier: e.target.value as any })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="form-label">Claim History (past 5 years)</label>
              <input
                type="number"
                className="input"
                value={formData.claim_history}
                onChange={(e) => setFormData({ ...formData, claim_history: Number(e.target.value) })}
                min="0"
              />
            </div>
          </div>

          <button
            onClick={handleAssess}
            disabled={loading}
            className="btn-primary w-full py-3 rounded-lg mt-6"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {loading ? "Assessing..." : "Run Risk Assessment"}
          </button>
        </div>

        {/* Quick Reference */}
        <div className="space-y-4">
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Risk Scale
            </h3>
            <div className="space-y-2">
              {[
                { label: "Low", range: "0-30", color: "var(--success)" },
                { label: "Medium", range: "31-50", color: "var(--warning)" },
                { label: "High", range: "51-75", color: "var(--danger)" },
                { label: "Critical", range: "76-100", color: "var(--danger)" },
              ].map(({ label, range, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>{label}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{range}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-lg p-4"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Assessment Tips
            </h3>
            <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              <li>• Verify all claim history data</li>
              <li>• Check location risk tiers</li>
              <li>• Review property valuation</li>
              <li>• Consider seasonal factors</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Assessment Results */}
      {assessment && (
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Assessment Results
            </h3>
            <button
              onClick={() => setShowOverride(!showOverride)}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                background: "var(--warning-soft)",
                color: "var(--warning)",
                border: "1px solid var(--warning)",
              }}
            >
              🔒 Override Decision
            </button>
          </div>

          {/* Risk Score Gauge */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="none"
                    stroke="var(--bg-surface)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="none"
                    stroke={getRiskColor(assessment.risk_level).color}
                    strokeWidth="8"
                    strokeDasharray={`${(assessment.risk_score / 100) * 377} 377`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: getRiskColor(assessment.risk_level).color }}>
                    {assessment.risk_score}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Risk Score</span>
                </div>
              </div>
              <span
                className="mt-3 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: getRiskColor(assessment.risk_level).bg,
                  color: getRiskColor(assessment.risk_level).color,
                }}
              >
                {assessment.risk_level.toUpperCase()}
              </span>
            </div>

            <div className="col-span-2 space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Recommendation
                </h4>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {assessment.underwriting_recommendation}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Premium Adjustment</p>
                  <p className="text-lg font-bold" style={{ color: "var(--warning)" }}>
                    +{assessment.premium_adjustment}%
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Next Review</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {new Date(assessment.next_review_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Factors */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Key Risk Factors
              </h4>
              <ul className="space-y-2">
                {assessment.key_risk_factors.map((factor, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm p-2 rounded"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    <span style={{ color: "var(--danger)" }}>⚠️</span>
                    <span style={{ color: "var(--text-secondary)" }}>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Mitigation Strategies
              </h4>
              <ul className="space-y-2">
                {assessment.mitigation_strategies.map((strategy, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm p-2 rounded"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    <span style={{ color: "var(--success)" }}>✓</span>
                    <span style={{ color: "var(--text-secondary)" }}>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Override Panel */}
          {showOverride && (
            <div
              className="mt-6 p-4 rounded-lg"
              style={{ background: "var(--warning-soft)", border: "1px solid var(--warning)" }}
            >
              <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Override Decision
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="form-label">Decision</label>
                  <select
                    className="input"
                    value={overrideDecision}
                    onChange={(e) => setOverrideDecision(e.target.value as any)}
                  >
                    <option value="">Select decision...</option>
                    <option value="approve">Approve (despite high risk)</option>
                    <option value="reject">Reject (despite low risk)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Justification *</label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Provide detailed justification for this override decision..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleOverride}
                    disabled={!overrideDecision || !overrideReason.trim()}
                    className="btn-primary px-4 py-2 rounded-lg text-sm"
                  >
                    Submit Override
                  </button>
                  <button
                    onClick={() => setShowOverride(false)}
                    className="btn-ghost px-4 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  ⚠️ All override decisions are logged to the audit trail for compliance review.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
