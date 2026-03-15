import type { Metadata } from "next";

/**
 * Dashboard layout – shared sidebar navigation for role-based views.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Build role-based routing (/underwriter, /compliance)"
 *   docs/system-architecture.md §4 – "Role-specific dashboards"
 */

export const metadata: Metadata = {
  title: "Dashboard – InsurAI",
};

const NAV_LINKS = [
  { href: "/dashboard",             label: "Overview",    icon: "⬛" },
  { href: "/dashboard/underwriter", label: "Underwriter", icon: "📋" },
  { href: "/dashboard/compliance",  label: "Compliance",  icon: "🛡️" },
  { href: "/chat",                  label: "Policy Chat", icon: "💬" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 84px)" }}>
      {/* ── Sidebar ── */}
      <nav
        className="w-52 shrink-0 flex flex-col gap-0.5 p-3 border-r overflow-y-auto"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <p
          className="section-title px-2 pt-2 pb-3"
          style={{ margin: 0 }}
        >
          Dashboards
        </p>
        {NAV_LINKS.map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-white/5 hover:text-white"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </a>
        ))}
      </nav>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
