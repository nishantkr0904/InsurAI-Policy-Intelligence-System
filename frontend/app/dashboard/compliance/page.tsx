import type { Metadata } from "next";

/**
 * Compliance officer dashboard – regulatory flag monitor and audit tools.
 *
 * Architecture ref:
 *   docs/system-architecture.md §4 – "Compliance officers see regulatory flag monitors"
 *   docs/roadmap.md Phase 7 – "/compliance role-based route"
 */

export const metadata: Metadata = { title: "Compliance – InsurAI Dashboard" };

const QUICK_ACTIONS = [
  { label: "Check Policy Compliance", href: "/chat", desc: "Verify a policy against regulatory requirements." },
  { label: "Audit Query Logs",        href: "/chat", desc: "Review past policy queries and AI responses." },
  { label: "Flag Review",             href: "/chat", desc: "Ask the AI to identify non-compliant clauses." },
];

export default function CompliancePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Compliance View
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Regulatory monitoring and audit trail tools.
          </p>
        </div>
        <span
          className="badge ml-auto"
          style={{ background: "rgba(245,158,11,0.15)", color: "var(--warning)" }}
        >
          Compliance
        </span>
      </div>

      <div className="grid gap-3">
        {QUICK_ACTIONS.map(({ label, href, desc }) => (
          <a
            key={label}
            href={href}
            className="card flex items-center justify-between hover:border-[var(--accent)] transition-colors"
            style={{ textDecoration: "none" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{desc}</p>
            </div>
            <span style={{ color: "var(--text-secondary)" }}>→</span>
          </a>
        ))}
      </div>

      <div className="card">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--warning)" }}>Note:</strong> Full audit logging (P8) will surface
          per-query records here. Agentic compliance checking (T11) is planned for the next phase.
        </p>
      </div>
    </div>
  );
}
