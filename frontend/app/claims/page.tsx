"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";

/**
 * Claims Validation page – FR012-FR015
 */

interface ClaimResult {
  status: "approved" | "denied" | "pending";
  reasoning: string;
  clauses: { ref: string; text: string }[];
  riskScore: number;
}

const CLAIM_TYPES = [
  { value: "property_damage", label: "Property Damage" },
  { value: "liability", label: "Liability" },
  { value: "medical", label: "Medical" },
  { value: "vehicle", label: "Vehicle" },
  { value: "business_interruption", label: "Business Interruption" },
];

function mockResult(form: { claimType: string; amount: string; description: string }): ClaimResult {
  const amount = parseFloat(form.amount) || 0;
  if (amount > 50000) {
    return {
      status: "denied",
      reasoning:
        "The claimed amount of $" +
        amount.toLocaleString() +
        " exceeds the per-incident coverage limit of $50,000 specified in Section 4.2 of the policy.",
      clauses: [
        { ref: "§4.2", text: "Maximum per-incident coverage shall not exceed $50,000 USD." },
        { ref: "§4.5", text: "Claims exceeding policy limits will be denied in full unless supplemental coverage is in effect." },
      ],
      riskScore: 82,
    };
  }
  if (form.claimType === "medical" && !form.description.trim()) {
    return {
      status: "pending",
      reasoning:
        "Medical claims require a detailed description of the incident, diagnosis codes, and provider information before a determination can be made.",
      clauses: [
        { ref: "§7.1", text: "Medical claims must include attending physician statement and itemized billing." },
      ],
      riskScore: 45,
    };
  }
  return {
    status: "approved",
    reasoning:
      "The claim meets all coverage criteria under the active policy. Incident date, claim type, and amount are all within policy parameters.",
    clauses: [
      { ref: "§2.1", text: "Coverage applies to all listed perils occurring within the policy period." },
      { ref: "§3.4", text: "Approved claims will be settled within 30 business days of validation." },
    ],
    riskScore: 18,
  };
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  approved: { color: "var(--success)", bg: "rgba(34,197,94,0.12)", label: "Approved" },
  denied: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", label: "Denied" },
  pending: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)", label: "Pending Review" },
};

export default function ClaimsPage() {
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    claimId: "",
    policyNumber: "",
    claimType: "property_damage",
    incidentDate: "",
    amount: "",
    description: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1500));
    setResult(mockResult(form));
    setLoading(false);
  }

  const style = result ? STATUS_STYLES[result.status] : null;

  return (
    <AuthGuard>
    <div className="px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Claims Validation
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Submit a claim for AI-powered validation against your active policy.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="form-label">Claim ID</label>
            <input
              className="input"
              name="claimId"
              value={form.claimId}
              onChange={handleChange}
              placeholder="CLM-0001"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Policy Number</label>
            <input
              className="input"
              name="policyNumber"
              value={form.policyNumber}
              onChange={handleChange}
              placeholder="AUTO-2024-001"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Claim Type</label>
            <select className="input" name="claimType" value={form.claimType} onChange={handleChange}>
              {CLAIM_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Incident Date</label>
            <input
              className="input"
              name="incidentDate"
              type="date"
              value={form.incidentDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="form-label">Claim Amount (USD)</label>
            <input
              className="input"
              name="amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={handleChange}
              placeholder="10000"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="form-label">Description</label>
            <textarea
              className="input"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the incident in detail…"
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Validating…
            </span>
          ) : "Validate Claim →"}
        </button>
      </form>

      {/* Result */}
      {result && style && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              Validation Result
            </h2>
            <span className="badge font-semibold" style={{ background: style.bg, color: style.color }}>
              {style.label}
            </span>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {result.reasoning}
          </p>

          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Risk Score</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${result.riskScore}%`,
                  background:
                    result.riskScore > 70
                      ? "var(--danger)"
                      : result.riskScore > 40
                      ? "var(--warning)"
                      : "var(--success)",
                }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {result.riskScore}/100
            </span>
          </div>

          {result.clauses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Referenced Clauses
              </p>
              {result.clauses.map(({ ref, text }) => (
                <div
                  key={ref}
                  className="flex gap-3 rounded-lg px-4 py-3 text-sm"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  <span className="shrink-0 font-bold" style={{ color: "var(--accent)" }}>
                    {ref}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
