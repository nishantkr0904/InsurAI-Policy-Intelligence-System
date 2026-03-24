"use client";
import { useState } from "react";
import { toast } from "sonner";
import ClaimsQueue, { type PendingClaim } from "./ClaimsQueue";
import ValidationResults, { type ValidationResult } from "./ValidationResults";
import ClaimDecision, { type ClaimDecision as ClaimDecisionType } from "./ClaimDecision";
import ClaimChat from "./ClaimChat";
import ClaimDocumentUpload from "@/components/ClaimDocumentUpload";
import { validateClaim } from "@/lib/api";
import { getWorkspaceId, isDemoUser } from "@/lib/auth";

type Tab = "queue" | "validate" | "decision" | "chat";

interface UploadedDocument {
  id: string;
  filename: string;
  size: number;
}

const CLAIM_TYPES = [
  { value: "collision", label: "Collision" },
  { value: "property_damage", label: "Property Damage" },
  { value: "liability", label: "Liability" },
  { value: "medical", label: "Medical" },
  { value: "vehicle", label: "Vehicle" },
  { value: "business_interruption", label: "Business Interruption" },
];

export default function ClaimsClient() {
  const isDemo = isDemoUser();
  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const [selectedClaim, setSelectedClaim] = useState<PendingClaim | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  // Form state for manual validation
  const [form, setForm] = useState({
    claimId: "",
    policyNumber: "",
    claimType: "collision",
    incidentDate: "",
    amount: "",
    description: "",
  });

  function handleSelectClaim(claim: PendingClaim) {
    setSelectedClaim(claim);
    setForm({
      claimId: claim.claim_id,
      policyNumber: claim.policy_number,
      claimType: claim.claim_type,
      incidentDate: claim.submission_date,
      amount: claim.amount.toString(),
      description: "",
    });
    setValidationResult(null);
    setActiveTab("validate");
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    setIsValidating(true);
    setValidationResult(null);

    try {
      if (isDemo) {
        // Demo mode: mock validation result
        await new Promise((r) => setTimeout(r, 1500));
        const mockResult: ValidationResult = {
          claim_id: form.claimId,
          approval_status: Math.random() > 0.3 ? "approved_with_conditions" : "approved",
          risk_score: Math.floor(Math.random() * 50) + 20,
          severity: "medium",
          referenced_clauses: [
            { clause_id: "4.2.1", title: "Collision Coverage", page: 12, snippet: "Covers direct and accidental loss..." },
            { clause_id: "4.2.3", title: "Deductible Requirements", page: 13, snippet: "A $500 deductible applies..." },
          ],
          confidence_score: 0.89,
          reasoning: `Claim ${form.claimId} has been analyzed against policy ${form.policyNumber}. The ${form.claimType} claim for $${parseFloat(form.amount).toLocaleString()} is covered under Section 4.2.1 (Collision Coverage). A $500 deductible applies per Section 4.2.3. No exclusions triggered based on the provided description.`,
          next_steps: [
            "Apply $500 deductible to claim amount",
            "Request repair estimate from certified shop",
            "Verify no prior claims for same incident",
            "Process payment upon estimate approval",
          ],
          conditions: ["$500 deductible applies", "Repair must use certified shop"],
        };
        setValidationResult(mockResult);
        toast.success("Claim validated successfully");
      } else {
        const response = await validateClaim({
          claim_id: form.claimId,
          policy_number: form.policyNumber,
          claim_type: form.claimType,
          incident_date: form.incidentDate,
          amount: parseFloat(form.amount) || 0,
          description: form.description,
          workspace_id: getWorkspaceId() || "default",
        });

        // Map API response to ValidationResult
        const result: ValidationResult = {
          claim_id: form.claimId,
          approval_status: response.status === "denied" ? "denied" :
                          response.status === "pending" ? "requires_review" :
                          response.risk_score > 50 ? "approved_with_conditions" : "approved",
          risk_score: response.risk_score,
          severity: response.risk_score >= 70 ? "critical" :
                   response.risk_score >= 50 ? "high" :
                   response.risk_score >= 30 ? "medium" : "low",
          referenced_clauses: response.clauses.map((c) => ({
            clause_id: c.ref,
            title: c.ref,
            page: 1,
            snippet: c.text,
          })),
          confidence_score: 0.85,
          reasoning: response.reasoning,
          next_steps: ["Review validation result", "Make final decision", "Document reasoning"],
        };
        setValidationResult(result);
        toast.success("Claim validated successfully");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleDecisionSubmit(decision: ClaimDecisionType) {
    setIsSubmittingDecision(true);

    try {
      // In production, submit to audit API
      await new Promise((r) => setTimeout(r, 1000));

      toast.success(`Claim ${decision.claim_id} ${decision.decision.replace(/_/g, " ")}`);

      if (decision.is_override) {
        toast.info("Override logged to audit trail");
      }

      // Reset state
      setSelectedClaim(null);
      setValidationResult(null);
      setForm({
        claimId: "",
        policyNumber: "",
        claimType: "collision",
        incidentDate: "",
        amount: "",
        description: "",
      });
      setActiveTab("queue");
    } catch (error) {
      toast.error("Failed to submit decision");
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  const tabs: { id: Tab; label: string; disabled: boolean }[] = [
    { id: "queue", label: "Claims Queue", disabled: false },
    { id: "validate", label: "Validate", disabled: false },
    { id: "decision", label: "Decision", disabled: !validationResult },
    { id: "chat", label: "Policy Chat", disabled: !form.policyNumber },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Claims Adjuster Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Review, validate, and process insurance claims
          </p>
        </div>
        {isDemo && (
          <span
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ background: "rgba(245,158,11,0.15)", color: "var(--warning)" }}
          >
            DEMO MODE
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-surface)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: activeTab === tab.id ? "var(--bg-elevated)" : "transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "queue" && (
          <ClaimsQueue onSelectClaim={handleSelectClaim} isDemo={isDemo} />
        )}

        {activeTab === "validate" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Validation Form */}
            <form onSubmit={handleValidate} className="card space-y-4">
              <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Claim Details
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="form-label">Claim ID</label>
                  <input
                    className="input"
                    name="claimId"
                    value={form.claimId}
                    onChange={handleFormChange}
                    placeholder="CLM-0001"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Policy Number</label>
                  <input
                    className="input"
                    name="policyNumber"
                    value={form.policyNumber}
                    onChange={handleFormChange}
                    placeholder="POL-AUTO-001"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Claim Type</label>
                  <select
                    className="input"
                    name="claimType"
                    value={form.claimType}
                    onChange={handleFormChange}
                  >
                    {CLAIM_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="form-label">Incident Date</label>
                  <input
                    className="input"
                    name="incidentDate"
                    type="date"
                    value={form.incidentDate}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="form-label">Claim Amount (USD)</label>
                  <input
                    className="input"
                    name="amount"
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={handleFormChange}
                    placeholder="10000"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="form-label">Description</label>
                  <textarea
                    className="input"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Describe the incident..."
                  />
                </div>

                {/* Document Upload */}
                <div className="space-y-1 col-span-2">
                  <label className="form-label">Supporting Documents</label>
                  <ClaimDocumentUpload
                    workspaceId={getWorkspaceId() || "default"}
                    documents={documents}
                    onDocumentAdded={(doc) => setDocuments((prev) => [...prev, doc])}
                    onDocumentRemoved={(id) =>
                      setDocuments((prev) => prev.filter((d) => d.id !== id))
                    }
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={isValidating}>
                {isValidating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Validating...
                  </span>
                ) : (
                  "Validate Claim"
                )}
              </button>
            </form>

            {/* Validation Results */}
            <div>
              {validationResult ? (
                <ValidationResults
                  result={validationResult}
                  onQueryPolicy={() => setActiveTab("chat")}
                />
              ) : (
                <div
                  className="card h-full flex items-center justify-center"
                  style={{ minHeight: "400px" }}
                >
                  <div className="text-center">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="mx-auto mb-3"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Submit a claim to see validation results
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "decision" && validationResult && (
          <div className="max-w-2xl mx-auto">
            <div className="card">
              <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Final Decision for {validationResult.claim_id}
              </h2>
              <ClaimDecision
                claimId={validationResult.claim_id}
                aiRecommendation={validationResult.approval_status}
                claimAmount={parseFloat(form.amount) || 0}
                onDecisionSubmit={handleDecisionSubmit}
                isSubmitting={isSubmittingDecision}
              />
            </div>
          </div>
        )}

        {activeTab === "chat" && form.policyNumber && (
          <div className="card h-[500px]">
            <ClaimChat
              policyNumber={form.policyNumber}
              claimId={form.claimId || "NEW"}
              initialContext={form.description}
              isDemo={isDemo}
            />
          </div>
        )}
      </div>
    </div>
  );
}
