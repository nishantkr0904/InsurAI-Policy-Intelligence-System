import type { Metadata } from "next";
import Link from "next/link";

/**
 * Dashboard overview – analytics & quick actions.
 * FR025-FR027: policy analytics, query analytics, risk trends.
 */

export const metadata: Metadata = { title: "Dashboard – InsurAI" };

const STATS = [
  { label: "Documents Indexed", value: "1,247", change: "+12%", up: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    color: "var(--accent)" },
  { label: "Queries Today", value: "384", change: "+8%", up: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    color: "var(--purple)" },
  { label: "Claims Processed", value: "56", change: "-3%", up: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    color: "var(--success)" },
  { label: "Fraud Alerts", value: "7", change: "+2", up: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    color: "var(--danger)" },
];

const QUICK_ACTIONS = [
  { href: "/chat",        label: "Policy Chat",      desc: "Ask questions about uploaded policies",   accent: "var(--accent)",   bg: "var(--accent-soft)" },
  { href: "/claims",      label: "Validate Claim",   desc: "Submit a claim for AI validation",        accent: "var(--purple)",   bg: "var(--purple-soft)" },
  { href: "/fraud",       label: "Fraud Review",     desc: "Review flagged fraud alerts",             accent: "var(--danger)",   bg: "var(--danger-soft)" },
  { href: "/compliance",  label: "Compliance Audit", desc: "Check regulatory compliance",             accent: "var(--warning)",  bg: "var(--warning-soft)" },
];

const RECENT_ACTIVITY = [
  { time: "2m ago", event: "Policy AUTO-2024-001 indexed successfully", type: "success" },
  { time: "15m ago", event: "Fraud alert flagged on Claim CLM-8821", type: "warning" },
  { time: "1h ago", event: "Compliance report generated for workspace acme-corp", type: "info" },
  { time: "2h ago", event: "Claim CLM-8820 validated – Approved", type: "success" },
  { time: "3h ago", event: "Policy COMM-2024-087 failed indexing – retrying", type: "error" },
];

const TYPE_COLORS: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--danger)",
  info: "var(--accent)",
};

export default function DashboardPage() {
  return (
    <div className="px-6 py-6 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Overview of your InsurAI workspace activity
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map(({ label, value, change, up, icon, color }) => (
          <div key={label} className="stat-card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${color}1a`, color }}
              >
                {icon}
              </div>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: up ? "var(--success)" : "var(--danger)",
                  background: up ? "var(--success-soft)" : "var(--danger-soft)",
                }}
              >
                {change}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {QUICK_ACTIONS.map(({ href, label, desc, accent, bg }) => (
            <Link
              key={href}
              href={href}
              className="card card-hover flex flex-col gap-3"
              style={{ textDecoration: "none" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: bg, color: accent }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: accent }}
                  />
                </div>
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
              <span className="text-xs font-medium" style={{ color: accent }}>Open →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="section-title">Recent Activity</h2>
        <div className="card p-0 overflow-hidden">
          {RECENT_ACTIVITY.map(({ time, event, type }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3.5"
              style={{
                borderBottom: i < RECENT_ACTIVITY.length - 1 ? "1px solid var(--border-subtle)" : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: TYPE_COLORS[type] }}
              />
              <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>{event}</span>
              <span
                className="text-xs shrink-0 px-2 py-0.5 rounded"
                style={{ color: "var(--text-secondary)", background: "var(--bg-surface)" }}
              >
                {time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-dashboard links */}
      <div className="flex gap-4">
        <Link
          href="/dashboard/underwriter"
          className="card card-hover flex-1 flex items-center justify-between p-4"
          style={{ textDecoration: "none" }}
        >
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Underwriter Dashboard</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Risk assessment tools</p>
          </div>
          <span style={{ color: "var(--accent)" }}>→</span>
        </Link>
        <Link
          href="/dashboard/compliance"
          className="card card-hover flex-1 flex items-center justify-between p-4"
          style={{ textDecoration: "none" }}
        >
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Compliance Dashboard</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Regulatory monitoring</p>
          </div>
          <span style={{ color: "var(--warning)" }}>→</span>
        </Link>
      </div>
    </div>
  );
}

