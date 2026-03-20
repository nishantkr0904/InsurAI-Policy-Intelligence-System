"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUser } from "@/lib/auth";
import RiskAssessmentForm from "@/components/RiskAssessmentForm";
import RiskAssessmentResults from "@/components/RiskAssessmentResults";
import type { RiskAssessmentResponse } from "@/lib/api";

export default function UnderwriterClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [assessmentResult, setAssessmentResult] = useState<RiskAssessmentResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    setUser(u);
  }, [router]);

  const workspace = user?.workspace ?? "default";

  const handleNewAssessment = () => {
    setAssessmentResult(null);
  };

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto w-full space-y-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Underwriter Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Workspace: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{workspace}</span>{" "}
            <span style={{ color: "var(--text-secondary)" }}>·</span> Risk Assessment & Coverage Analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-accent">Underwriter</span>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────– */}
      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setAssessmentResult(null)}
          className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: !assessmentResult ? "var(--accent)" : "transparent",
            color: !assessmentResult ? "var(--accent)" : "var(--text-secondary)",
            background: "none",
            cursor: "pointer",
          }}
        >
          📊 Risk Assessment
        </button>
        <Link
          href="/chat"
          className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: "transparent",
            color: "var(--text-secondary)",
            textDecoration: "none",
          }}
        >
          💬 Coverage Query
        </Link>
      </div>

      {/* ── Main Content ────────────────────────────────────– */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Form or Results */}
        <div className="col-span-2">
          {assessmentResult ? (
            <RiskAssessmentResults result={assessmentResult} onNewAssessment={handleNewAssessment} />
          ) : (
            <div
              className="rounded-lg p-6"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                Policy Risk Assessment
              </h2>
              <RiskAssessmentForm
                workspaceId={workspace}
                onAssessmentComplete={(result) => setAssessmentResult(result)}
              />
            </div>
          )}
        </div>

        {/* Right: Quick Info & Guidance */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Recent Assessments
            </h3>
            <div className="space-y-3">
              {[
                { policy: "HOME-2024-001", level: "low", score: 28 },
                { policy: "AUTO-2024-087", level: "medium", score: 52 },
                { policy: "COMM-2024-045", level: "high", score: 74 },
              ].map(({ policy, level, score }) => (
                <div key={policy} className="p-2 rounded" style={{ background: "var(--bg-surface)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {policy}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background:
                          level === "low"
                            ? "var(--success-soft)"
                            : level === "medium"
                              ? "var(--warning-soft)"
                              : "var(--danger-soft)",
                        color:
                          level === "low"
                            ? "var(--success)"
                            : level === "medium"
                              ? "var(--warning)"
                              : "var(--danger)",
                      }}
                    >
                      {score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guidance */}
          <div
            className="rounded-lg p-4"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Assessment Tips
            </h3>
            <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <li>• Include all relevant claim history</li>
              <li>• Verify location risk tier accuracy</li>
              <li>• Consider seasonal risk variations</li>
              <li>• Cross-check with policy documents</li>
              <li>• Document mitigation steps taken</li>
            </ul>
          </div>

          {/* Risk Score Scale */}
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
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                      {label}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {range}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Info Banner ─────────────────────────────────────– */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent)" }}>📋 Compliance Note:</strong> Risk assessments generated by this
          tool are AI-driven recommendations only and do not constitute formal underwriting decisions. Always supplement
          with manual review, verify against original policy documents, and document all assessments for regulatory
          compliance.
        </p>
      </div>
    </div>
  );
}
