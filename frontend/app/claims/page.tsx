"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import ClaimDocumentUpload from "@/components/ClaimDocumentUpload";
import { validateClaim, type ClaimValidationResponse } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

/**
 * Claims Validation page – FR012-FR015
 */

interface UploadedDocument {
  id: string;
  filename: string;
  size: number;
}

const CLAIM_TYPES = [
  { value: "property_damage", label: "Property Damage" },
  { value: "liability", label: "Liability" },
  { value: "medical", label: "Medical" },
  { value: "vehicle", label: "Vehicle" },
  { value: "business_interruption", label: "Business Interruption" },
];

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  approved: { color: "var(--success)", bg: "rgba(34,197,94,0.12)", label: "Approved" },
  denied: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", label: "Denied" },
  pending: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)", label: "Pending Review" },
};

export default function ClaimsPage() {
  const [result, setResult] = useState<ClaimValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
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

  function handleDocumentAdded(doc: UploadedDocument) {
    setDocuments((prev) => [...prev, doc]);
    setError(null);
  }

  function handleDocumentRemoved(id: string) {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await validateClaim({
        claim_id: form.claimId,
        policy_number: form.policyNumber,
        claim_type: form.claimType,
        incident_date: form.incidentDate,
        amount: parseFloat(form.amount) || 0,
        description: form.description,
        workspace_id: getWorkspaceId() || "default",
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate claim");
    } finally {
      setLoading(false);
    }
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

        {/* Error Banner */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ background: "rgba(239,68,68,0.12)", color: "var(--danger)", border: "1px solid var(--danger)" }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

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

            {/* Document Upload - FR012 */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="form-label">Supporting Documents</label>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                Attach receipts, photos, police reports, or other evidence
              </p>
              <ClaimDocumentUpload
                workspaceId={getWorkspaceId() || "default"}
                documents={documents}
                onDocumentAdded={handleDocumentAdded}
                onDocumentRemoved={handleDocumentRemoved}
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

            {/* Attached Documents Info */}
            {documents.length > 0 && (
              <div
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ color: "var(--accent)" }}
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span style={{ color: "var(--text-secondary)" }}>
                  {documents.length} supporting {documents.length === 1 ? "document" : "documents"} attached
                </span>
              </div>
            )}

            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {result.reasoning}
            </p>

            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Risk Score</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${result.risk_score}%`,
                    background:
                      result.risk_score > 70
                        ? "var(--danger)"
                        : result.risk_score > 40
                          ? "var(--warning)"
                          : "var(--success)",
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                {result.risk_score}/100
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
