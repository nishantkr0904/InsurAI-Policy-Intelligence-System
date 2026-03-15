import type { Metadata } from "next";

/**
 * Underwriter dashboard – risk assessment and coverage query tools.
 *
 * Architecture ref:
 *   docs/system-architecture.md §4 – "Underwriters see risk-assessment tools"
 *   docs/roadmap.md Phase 7 – "/underwriter role-based route"
 */

export const metadata: Metadata = { title: "Underwriter – InsurAI Dashboard" };

const QUICK_ACTIONS = [
  { label: "Query Coverage Terms",   href: "/chat", desc: "Ask about deductibles, limits, and exclusions." },
  { label: "Analyse Claim Exposure", href: "/chat", desc: "Review how a loss scenario maps to active policies." },
  { label: "Upload Policy",          href: "/chat", desc: "Ingest a new PDF or DOCX policy for indexing." },
];

export default function UnderwriterPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Underwriter View
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Risk assessment and coverage intelligence tools.
          </p>
        </div>
        <span className="badge badge-accent ml-auto">Underwriter</span>
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
          <strong style={{ color: "var(--warning)" }}>Note:</strong> AI responses are informational only and do not
          constitute legal or underwriting advice. Always verify against the original policy document.
        </p>
      </div>
    </div>
  );
}
