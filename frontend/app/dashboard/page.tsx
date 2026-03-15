import type { Metadata } from "next";

/**
 * Dashboard overview – role selection landing page.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "role-based routing"
 *   docs/system-architecture.md §4 – "Role-specific dashboards"
 */

export const metadata: Metadata = { title: "Overview – InsurAI Dashboard" };

const ROLE_CARDS = [
  {
    href: "/dashboard/underwriter",
    title: "Underwriter",
    description: "Review risk assessments, query policy coverage terms, and analyse claim exposure.",
    badge: "Risk & Coverage",
    color: "var(--accent)",
  },
  {
    href: "/dashboard/compliance",
    title: "Compliance Officer",
    description: "Monitor regulatory flags, audit policy adherence, and track open compliance items.",
    badge: "Regulatory",
    color: "var(--warning)",
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Select your role to access the relevant tools.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ROLE_CARDS.map(({ href, title, description, badge, color }) => (
          <a
            key={href}
            href={href}
            className="card flex flex-col gap-3 hover:border-[var(--accent)] transition-colors"
            style={{ textDecoration: "none" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                {title}
              </span>
              <span className="badge" style={{ background: `${color}22`, color }}>
                {badge}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {description}
            </p>
          </a>
        ))}
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Policy Chat</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Ask questions about any uploaded policy document.
          </p>
        </div>
        <a href="/chat" className="btn-primary shrink-0">Open Chat →</a>
      </div>
    </div>
  );
}
