"use client";
import { useEffect, useState } from "react";
import { fetchClaimsQueue, type ClaimQueueItem } from "@/lib/api";

export interface PendingClaim {
  claim_id: string;
  policy_id?: string;
  policy_number: string;
  claimant_name: string;
  claim_type: string;
  amount: number;
  submission_date: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_review" | "validated";
  description?: string;
}

interface ClaimsQueueProps {
  onSelectClaim: (claim: PendingClaim) => void;
  workspaceId: string;
}

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  low: { bg: "rgba(156,163,175,0.15)", color: "var(--text-secondary)" },
  medium: { bg: "rgba(59,130,246,0.15)", color: "var(--accent)" },
  high: { bg: "rgba(245,158,11,0.15)", color: "var(--warning)" },
  urgent: { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "rgba(245,158,11,0.15)", color: "var(--warning)", label: "Pending" },
  in_review: { bg: "rgba(59,130,246,0.15)", color: "var(--accent)", label: "In Review" },
  validated: { bg: "rgba(34,197,94,0.15)", color: "var(--success)", label: "Validated" },
};

export default function ClaimsQueue({ onSelectClaim, workspaceId }: ClaimsQueueProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "in_review" | "urgent">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadClaims(showSpinner: boolean) {
      if (showSpinner) {
        setLoading(true);
      }
      try {
        const data = await fetchClaimsQueue(workspaceId);
        if (!active) return;
        const mapped: PendingClaim[] = data.map((claim: ClaimQueueItem) => ({
          claim_id: claim.claim_id,
          policy_id: claim.policy_id,
          policy_number: claim.policy_number,
          claimant_name: claim.claimant_name,
          claim_type: claim.claim_type,
          amount: claim.amount,
          submission_date: claim.submission_date,
          priority: claim.priority,
          status: claim.status,
          description: claim.description,
        }));
        setClaims(mapped);
        setLoadError(null);
      } catch (error) {
        if (!active) return;
        setLoadError((error as Error).message || "Failed to load claims queue");
      } finally {
        if (active && showSpinner) {
          setLoading(false);
        }
      }
    }

    void loadClaims(true);
    intervalId = setInterval(() => {
      void loadClaims(false);
    }, 5000);

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [workspaceId]);

  const filteredClaims = claims.filter((claim) => {
    // Filter by status/priority
    if (filter === "pending" && claim.status !== "pending") return false;
    if (filter === "in_review" && claim.status !== "in_review") return false;
    if (filter === "urgent" && claim.priority !== "urgent") return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        claim.claim_id.toLowerCase().includes(query) ||
        claim.policy_number.toLowerCase().includes(query) ||
        claim.claimant_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const urgentCount = claims.filter((c) => c.priority === "urgent").length;
  const pendingCount = claims.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {claims.length}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Total Claims</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--warning)" }}>
            {pendingCount}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Pending</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--danger)" }}>
            {urgentCount}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Urgent</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
            ${(claims.reduce((sum, c) => sum + c.amount, 0) / 1000).toFixed(0)}K
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Total Value</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            className="input w-full"
            placeholder="Search by claim ID, policy, or claimant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "in_review", "urgent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: filter === f ? "var(--accent)" : "var(--bg-surface)",
                color: filter === f ? "white" : "var(--text-secondary)",
                border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {f === "all" ? "All" : f === "in_review" ? "In Review" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-2">
        {loading ? (
          <div className="card p-8 text-center">
            <p style={{ color: "var(--text-secondary)" }}>Loading claims queue…</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="card p-8 text-center">
            <p style={{ color: "var(--text-secondary)" }}>
              {loadError ? "Unable to load claims queue" : `No claims found for workspace \"${workspaceId}\"`}
            </p>
            {loadError && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {loadError}
              </p>
            )}
          </div>
        ) : (
          filteredClaims.map((claim) => {
            const priorityStyle = PRIORITY_STYLES[claim.priority];
            const statusStyle = STATUS_STYLES[claim.status];

            return (
              <div
                key={claim.claim_id}
                onClick={() => onSelectClaim(claim)}
                className="card p-4 cursor-pointer hover:border-[var(--accent)] transition-colors"
                style={{ borderLeft: `3px solid ${priorityStyle.color}` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {claim.claim_id}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: priorityStyle.bg, color: priorityStyle.color }}
                      >
                        {claim.priority.toUpperCase()}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {claim.claimant_name} &bull; {claim.policy_number}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {claim.claim_type.replace(/_/g, " ")} &bull; Submitted {claim.submission_date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                      ${claim.amount.toLocaleString()}
                    </p>
                    <button
                      className="text-xs mt-1 hover:underline"
                      style={{ color: "var(--accent)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClaim(claim);
                      }}
                    >
                      Review &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
