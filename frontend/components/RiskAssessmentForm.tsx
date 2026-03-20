"use client";

import React, { useState } from "react";
import type { RiskAssessmentRequest, RiskAssessmentResponse } from "@/lib/api";
import { performRiskAssessment } from "@/lib/api";

interface RiskAssessmentFormProps {
  workspaceId: string;
  onAssessmentComplete: (result: RiskAssessmentResponse) => void;
}

export default function RiskAssessmentForm({ workspaceId, onAssessmentComplete }: RiskAssessmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RiskAssessmentRequest>>({
    policy_id: "",
    policy_type: "auto",
    coverage_amount: 500000,
    deductible: 5000,
    insured_value: 250000,
    location_risk_tier: "medium",
    claim_history: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const request: RiskAssessmentRequest = {
        policy_id: formData.policy_id || "POL-0000",
        policy_type: formData.policy_type || "auto",
        coverage_amount: formData.coverage_amount || 500000,
        deductible: formData.deductible || 5000,
        insured_value: formData.insured_value || 250000,
        location_risk_tier: formData.location_risk_tier || "medium",
        claim_history: formData.claim_history || 0,
        workspace_id: workspaceId,
      };

      // Mock assessment since backend isn't ready
      // In production, this would call the actual API
      const mockResponse: RiskAssessmentResponse = generateMockAssessment(request);
      onAssessmentComplete(mockResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Policy Information ──────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Policy Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              Policy ID
            </label>
            <input
              type="text"
              name="policy_id"
              value={formData.policy_id}
              onChange={handleChange}
              placeholder="POL-2024-001"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              Policy Type
            </label>
            <select
              name="policy_type"
              value={formData.policy_type}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="auto">Auto</option>
              <option value="home">Home</option>
              <option value="health">Health</option>
              <option value="life">Life</option>
              <option value="property">Property</option>
              <option value="liability">Liability</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Coverage Details ────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Coverage Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              Coverage Amount ($)
            </label>
            <input
              type="number"
              name="coverage_amount"
              value={formData.coverage_amount}
              onChange={handleChange}
              min="0"
              step="50000"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-xs mt-1 text-center" style={{ color: "var(--text-secondary)" }}>
              {formData.coverage_amount?.toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              Deductible ($)
            </label>
            <input
              type="number"
              name="deductible"
              value={formData.deductible}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-xs mt-1 text-center" style={{ color: "var(--text-secondary)" }}>
              {formData.deductible?.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Risk Factors ────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Risk Factors
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              Insured Value ($)
            </label>
            <input
              type="number"
              name="insured_value"
              value={formData.insured_value}
              onChange={handleChange}
              min="0"
              step="50000"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-xs mt-1 text-center" style={{ color: "var(--text-secondary)" }}>
              {formData.insured_value?.toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
              Location Risk Tier
            </label>
            <select
              name="location_risk_tier"
              value={formData.location_risk_tier}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Claim History ───────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Claim History
        </h3>
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
            Number of Claims (Past 5 Years)
          </label>
          <input
            type="number"
            name="claim_history"
            value={formData.claim_history}
            onChange={handleChange}
            min="0"
            max="20"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
            {formData.claim_history === 0
              ? "No prior claims (excellent)"
              : formData.claim_history === 1
                ? "1 claim in past 5 years"
                : `${formData.claim_history} claims in past 5 years`}
          </p>
        </div>
      </div>

      {/* ── Error Display ───────────────────────────────────── */}
      {error && (
        <div
          className="rounded-lg px-4 py-3"
          style={{
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
          }}
        >
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Submit Button ───────────────────────────────────– */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full text-sm font-semibold"
        style={{
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "Analyzing Risk..." : "Perform Risk Assessment"}
      </button>
    </form>
  );
}

// Mock assessment function - generates realistic risk assessment
function generateMockAssessment(request: RiskAssessmentRequest): RiskAssessmentResponse {
  let baseScore = 35;

  // Adjust by claim history
  baseScore += request.claim_history * 10;

  // Adjust by location risk
  if (request.location_risk_tier === "high") baseScore += 20;
  if (request.location_risk_tier === "medium") baseScore += 10;

  // Adjust by deductible (lower deductible = higher risk)
  if (request.deductible < 2500) baseScore += 15;
  else if (request.deductible < 5000) baseScore += 10;

  // Adjust by coverage vs insured value
  const coverageRatio = request.coverage_amount / request.insured_value;
  if (coverageRatio < 1.5) baseScore += 20;
  else if (coverageRatio > 3) baseScore += 10;

  // Cap at 100
  const riskScore = Math.min(baseScore + Math.random() * 5 - 2.5, 100);

  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore < 30) riskLevel = "low";
  else if (riskScore < 50) riskLevel = "medium";
  else if (riskScore < 75) riskLevel = "high";
  else riskLevel = "critical";

  const riskFactors: string[] = [];
  if (request.claim_history > 0) riskFactors.push(`${request.claim_history} claims in past 5 years`);
  if (request.location_risk_tier === "high") riskFactors.push("High-risk location");
  if (request.deductible < 5000) riskFactors.push("Low deductible may increase claim frequency");
  if (coverageRatio > 2.5) riskFactors.push("High coverage-to-value ratio");

  const strategies: string[] = [];
  if (riskLevel === "critical" || riskLevel === "high") {
    strategies.push("Increase deductible to reduce claim incentive");
    strategies.push("Implement loss prevention program");
  }
  if (request.claim_history > 1) {
    strategies.push("Request safety/compliance audit");
  }
  strategies.push("Annual policy review");

  const nextReview = new Date();
  nextReview.setFullYear(nextReview.getFullYear() + 1);

  let premiumAdj = 0;
  if (riskLevel === "low") premiumAdj = -5;
  else if (riskLevel === "medium") premiumAdj = 0;
  else if (riskLevel === "high") premiumAdj = 15;
  else premiumAdj = 30;

  const recommendations: Record<string, string> = {
    low: `Low risk profile. Consider standard premium. ${riskFactors.length === 0 ? "No concerns identified." : "Monitor identified factors."}`,
    medium: `Moderate risk. Recommend standard premium with annual review. ${riskFactors.length > 0 ? "Address key risk factors to improve profile." : ""}`,
    high: `Higher risk profile. Recommend ${Math.abs(premiumAdj)}% premium increase and enhanced monitoring.`,
    critical: `Critical risk. Recommend significant premium adjustment or additional requirements. Consider risk mitigation first.`,
  };

  return {
    risk_score: Math.round(riskScore * 10) / 10,
    risk_level: riskLevel,
    underwriting_recommendation: recommendations[riskLevel],
    key_risk_factors: riskFactors.length > 0 ? riskFactors : ["No significant risk factors identified"],
    mitigation_strategies: strategies,
    premium_adjustment: premiumAdj,
    next_review_date: nextReview.toISOString().split("T")[0],
  };
}
