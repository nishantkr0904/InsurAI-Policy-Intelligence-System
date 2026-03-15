"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUser, type InsurAIUser } from "@/lib/auth";

const STATS = [
  {
    label: "Documents Indexed", value: "1,247", change: "+12%", up: true, color: "var(--accent)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: "AI Queries Today", value: "384", change: "+8%", up: true, color: "var(--purple)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Claims Processed", value: "56", change: "-3%", up: false, color: "var(--success)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: "Fraud Alerts", value: "7", change: "+2", up: false, color: "var(--danger)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

const QUICK_ACTIONS = [
  { href: "/documents", label: "Upload Policy",    desc: "Upload PDF or DOCX policy documents for AI indexing", accent: "var(--accent)",  bg: "var(--accent-soft)",  icon: "📄" },
  { href: "/chat",      label: "Ask AI",           desc: "Query your policies with plain-English questions",     accent: "var(--purple)", bg: "var(--purple-soft)", icon: "💬" },
  { href: "/claims",    label: "Validate Claim",   desc: "Submit a claim scenario for AI-powered validation",    accent: "var(--success)", bg: "var(--success-soft)", icon: "✅" },
  { href: "/fraud",     label: "Fraud Review",     desc: "Review flagged suspicious patterns and alerts",        accent: "var(--danger)",  bg: "var(--danger-soft)",  icon: "🔍" },
  { href: "/compliance",label: "Compliance Audit", desc: "Check regulatory compliance and generate reports",     accent: "var(--warning)", bg: "var(--warning-soft)", icon: "🛡️" },
  { href: "/documents", label: "View Policies",    desc: "Browse indexed policies and their processing status",  accent: "var(--accent)",  bg: "var(--accent-soft)",  icon: "📂" },
];

const RECENT_ACTIVITY = [
  { time: "2m ago",   event: "Policy AUTO-2024-001 indexed successfully",          type: "success" },
  { time: "15m ago",  event: "Fraud alert flagged on Claim CLM-8821",              type: "warning" },
  { time: "1h ago",   event: "Compliance report generated for workspace acme-corp", type: "info" },
  { time: "2h ago",   event: "Claim CLM-8820 validated – Approved",                type: "success" },
  { time: "3h ago",   event: "Policy COMM-2024-087 failed indexing – retrying",    type: "error" },
];

const TYPE_COLORS: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error:   "var(--danger)",
  info:    "var(--accent)",
};

const EXAMPLE_QUESTIONS = [
  "What does clause 7 say about flood damage coverage?",
  "Is theft of electronics covered under this homeowner policy?",
  "What is the deductible for auto collision claims over $10,000?",
  "Are there exclusions for pre-existing conditions in this health policy?",
  "Validate: vehicle storm damage claim on 12/15/2024",
];

const ROLE_DASHBOARDS = [
  { href: "/dashboard/underwriter", label: "Underwriter Dashboard", desc: "Risk assessment & coverage tools", color: "var(--accent)" },
  { href: "/dashboard/compliance",  label: "Compliance Dashboard",  desc: "Regulatory monitoring & audits",  color: "var(--warning)" },
];

export default function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<InsurAIUser | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    setUser(u);
    // Show getting-started if documents haven't been uploaded yet
    const hasUploaded = localStorage.getItem("insurai_has_documents") === "true";
    setIsFirstVisit(!hasUploaded);
  }, [router]);

  function dismissOnboarding() {
    localStorage.setItem("insurai_has_documents", "true");
    setIsFirstVisit(false);
  }

  const workspace = user?.workspace ?? "default";

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto w-full space-y-8">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Workspace:{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{workspace}</span>
            {" · "}
            <span className="badge badge-accent" style={{ fontSize: "10px" }}>
              {user?.role?.replace(/_/g, " ") ?? "User"}
            </span>
          </p>
        </div>
        <Link href="/documents" className="btn-primary text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload Policy
        </Link>
      </div>

      {/* ── Getting Started Banner (first-time users) ────────── */}
      {isFirstVisit && (
        <div
          className="rounded-xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.08) 100%)",
            border: "1px solid rgba(59,130,246,0.3)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                🚀 Get started with InsurAI
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Follow these steps to start using AI-powered policy intelligence
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  { step: "1", label: "Upload a Policy", href: "/documents", done: false },
                  { step: "2", label: "AI Indexes It",   href: "/documents", done: false },
                  { step: "3", label: "Ask Questions",   href: "/chat",      done: false },
                  { step: "4", label: "Validate Claims", href: "/claims",    done: false },
                ].map(({ step, label, href }) => (
                  <Link
                    key={step}
                    href={href}
                    className="flex items-center gap-2 text-sm font-medium transition-all"
                    style={{
                      background: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: "8px", padding: "8px 14px",
                      color: "var(--text-primary)", textDecoration: "none",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >{step}</span>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={dismissOnboarding}
              className="btn-ghost text-xs shrink-0"
              style={{ padding: "6px 12px" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Stats Grid ──────────────────────────────────────── */}
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

      {/* ── Quick Actions ────────────────────────────────────── */}
      <div>
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          {QUICK_ACTIONS.map(({ href, label, desc, accent, bg, icon }) => (
            <Link
              key={label}
              href={href}
              className="card card-hover flex flex-col gap-3"
              style={{ textDecoration: "none" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base"
                  style={{ background: bg, color: accent }}
                >
                  {icon}
                </div>
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
              <span className="text-xs font-medium" style={{ color: accent }}>Open →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── AI Quick Query ───────────────────────────────────── */}
      <div>
        <h2 className="section-title">Ask InsurAI</h2>
        <div
          className="card"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)" }}
        >
          <p className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
            Example questions you can ask about your policies:
          </p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <Link
                key={q}
                href={`/chat?q=${encodeURIComponent(q)}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ color: "var(--accent)", flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{q}</span>
                <span className="ml-auto text-xs" style={{ color: "var(--accent)", flexShrink: 0 }}>Ask →</span>
              </Link>
            ))}
          </div>
          <Link href="/chat" className="btn-primary text-sm mt-4 inline-flex" style={{ textDecoration: "none" }}>
            Open AI Assistant →
          </Link>
        </div>
      </div>

      {/* ── Document State Awareness ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title" style={{ margin: 0 }}>Policy Documents</h2>
          <Link href="/documents" className="text-xs font-medium" style={{ color: "var(--accent)", textDecoration: "none" }}>
            View all →
          </Link>
        </div>
        <div className="card">
          {/* Simulated document status – real data comes from /documents page */}
          <div className="flex flex-col gap-0">
            {[
              { name: "AUTO-2024-001.pdf",  status: "Indexed",     size: "2.4 MB", color: "var(--success)" },
              { name: "COMM-2024-087.docx", status: "Processing",  size: "5.1 MB", color: "var(--warning)" },
              { name: "HOME-2023-112.pdf",  status: "Indexed",     size: "1.8 MB", color: "var(--success)" },
              { name: "HEALTH-Q1-2024.pdf", status: "Error",       size: "3.2 MB", color: "var(--danger)"  },
            ].map(({ name, status, size, color }, i) => (
              <div
                key={name}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: i < 3 ? "1px solid var(--border-subtle)" : undefined }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-surface)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-secondary)" }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{size}</p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{ color, background: `${color}1a` }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
          <Link href="/documents" className="btn-secondary text-xs mt-3 inline-flex" style={{ textDecoration: "none" }}>
            Upload Policy →
          </Link>
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────── */}
      <div>
        <h2 className="section-title">Recent Activity</h2>
        <div className="card p-0 overflow-hidden">
          {RECENT_ACTIVITY.map(({ time, event, type }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3.5"
              style={{ borderBottom: i < RECENT_ACTIVITY.length - 1 ? "1px solid var(--border-subtle)" : undefined }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLORS[type] }} />
              <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>{event}</span>
              <span className="text-xs shrink-0 px-2 py-0.5 rounded" style={{ color: "var(--text-secondary)", background: "var(--bg-surface)" }}>
                {time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Role-Based Dashboards ────────────────────────────── */}
      <div>
        <h2 className="section-title">Role Dashboards</h2>
        <div className="flex gap-4">
          {ROLE_DASHBOARDS.map(({ href, label, desc, color }) => (
            <Link
              key={href}
              href={href}
              className="card card-hover flex-1 flex items-center justify-between p-4"
              style={{ textDecoration: "none" }}
            >
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{desc}</p>
              </div>
              <span style={{ color }}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Security Footer ──────────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 py-2">
        {["🔒 SOC2 Compliant", "🛡️ PII Protected", "🔐 AES-256 Encrypted"].map((badge) => (
          <span key={badge} style={{ fontSize: "11px", color: "var(--text-muted)" }}>{badge}</span>
        ))}
      </div>
    </div>
  );
}
