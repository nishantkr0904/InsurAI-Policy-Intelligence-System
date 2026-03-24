"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUser, logout, type InsurAIUser } from "@/lib/auth";
import { getVisibleNavLinks, getRoleLabel, type NavLink } from "@/lib/rbac";

const ROLE_LABELS: Record<string, string> = {
  underwriter:       "Underwriter",
  compliance_officer: "Compliance",
  claims_adjuster:   "Claims",
  fraud_analyst:     "Fraud",
  broker:            "Broker",
  auditor:           "Auditor",
  customer:          "Customer",
  admin:             "Admin",
};

export default function Navbar() {
  const pathname  = usePathname();
  const router    = useRouter();

  const [authed, setAuthed]           = useState(false);
  const [user,   setUser]             = useState<InsurAIUser | null>(null);
  const [navLinks, setNavLinks]       = useState<NavLink[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  // Read auth state and compute role-based nav links on every pathname change
  useEffect(() => {
    const auth = isAuthenticated();
    setAuthed(auth);
    const currentUser = auth ? getUser() : null;
    setUser(currentUser);
    // Filter navigation links based on user role
    setNavLinks(getVisibleNavLinks(currentUser?.role || null));
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    setAuthed(false);
    setUser(null);
    setProfileOpen(false);
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    return pathname === href || pathname.startsWith(href + "/");
  }

  const isLandingPage    = pathname === "/";
  const isAuthPage       = pathname === "/login" || pathname === "/signup";
  const isOnboardingPage = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  /* ── Logo (shared) ──────────────────────────────────────── */
  const Logo = (
    <Link
      href={authed ? "/dashboard" : "/"}
      className="flex items-center gap-2.5 shrink-0"
      style={{ textDecoration: "none" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "var(--accent-gradient)", boxShadow: "var(--shadow-accent)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z"
            fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-bold text-sm tracking-tight gradient-text" style={{ letterSpacing: "-0.01em" }}>
        InsurAI
      </span>
      <span className="badge badge-accent">Beta</span>
    </Link>
  );

  /* ── Onboarding pages: no global navbar (layout provides its own header) ── */
  if (isOnboardingPage) return null;

  /* ── Auth / Login pages: minimal navbar ─────────────────── */
  if (isAuthPage) {
    return (
      <header
        className="shrink-0 flex items-center justify-between px-6 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)", height: "60px" }}
      >
        {Logo}
        <Link href="/" data-testid="back-to-landing" className="btn-ghost text-sm" style={{ textDecoration: "none" }}>
          ← Back to landing page
        </Link>
      </header>
    );
  }

  /* ── Landing page: marketing navbar ─────────────────────── */
  if (isLandingPage && !authed) {
    return (
      <header
        className="shrink-0 flex items-center justify-between px-6 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)", height: "60px" }}
      >
        {Logo}
        <div className="flex items-center gap-3">
          <Link href="/login"  className="btn-ghost  text-sm" style={{ textDecoration: "none" }}>Sign In</Link>
          <Link href="/signup" className="btn-primary text-sm" style={{ textDecoration: "none" }}>
            Start Free Trial
          </Link>
        </div>
      </header>
    );
  }

  /* ── Authenticated app navbar ────────────────────────────── */
  const workspace = user?.workspace ?? "default";
  const roleLabel = ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "User";

  return (
    <header
      className="shrink-0 flex items-center justify-between px-6 py-0 border-b"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-surface)",
        boxShadow: "0 1px 0 var(--border)",
        height: "60px",
      }}
    >
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-4">
        {Logo}

        <nav className="flex items-center gap-0.5">
          {navLinks.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="relative px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color] duration-150"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "rgba(59,130,246,0.1)" : "transparent",
                  textDecoration: "none",
                }}
              >
                {label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ background: "var(--accent-gradient)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Workspace + Notifications + Profile */}
      <div className="flex items-center gap-2">

        {/* Workspace pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", cursor: "default",
          }}
          title="Current workspace"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {workspace}
          </span>
        </div>

        {/* Role badge – only shown after a role has been selected */}
        {user?.role && (
          <span
            data-testid="role-badge"
            className="badge badge-accent"
            style={{ cursor: "default" }}
            title={`Your role: ${roleLabel}`}
          >
            {roleLabel}
          </span>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-[background-color,color]"
            style={{
              background: notifOpen ? "rgba(59,130,246,0.12)" : "transparent",
              color: "var(--text-secondary)",
              border: "none", cursor: "pointer",
            }}
            title="Notifications"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {/* Unread dot */}
            <span
              className="absolute rounded-full"
              style={{ width: "7px", height: "7px", background: "var(--danger)", top: "8px", right: "8px", border: "2px solid var(--bg-surface)" }}
            />
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 mt-2 rounded-xl py-1 overflow-hidden"
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                boxShadow: "var(--shadow-lg)", width: "320px", zIndex: 50, top: "100%",
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</span>
                <span className="badge badge-danger" style={{ fontSize: "10px" }}>2 new</span>
              </div>
              {[
                { icon: "⚠️", text: "Fraud alert on Claim CLM-8821", time: "15m ago", dot: "var(--danger)" },
                { icon: "✅", text: "Policy AUTO-2024-001 indexed", time: "1h ago", dot: "var(--success)" },
                { icon: "📋", text: "Compliance report generated", time: "2h ago", dot: "var(--accent)" },
              ].map(({ icon, text, time, dot }) => (
                <div key={text} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}>
                  <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>{text}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{time}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: dot }} />
                </div>
              ))}
              <div className="px-4 py-2.5 text-center">
                <span className="text-xs" style={{ color: "var(--accent)", cursor: "pointer" }}>View all notifications →</span>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-[background-color,border-color]"
            style={{
              background: profileOpen ? "rgba(59,130,246,0.12)" : "var(--bg-card)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--accent-gradient)", color: "#fff", flexShrink: 0 }}
            >
              {user?.initials ?? "?"}
            </div>
            <span className="text-sm font-medium max-w-[100px] truncate" style={{ color: "var(--text-primary)" }}>
              {user?.name ?? "User"}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 mt-2 rounded-xl overflow-hidden"
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                boxShadow: "var(--shadow-lg)", width: "220px", zIndex: 50, top: "100%",
              }}
            >
              {/* User info */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {user?.role && (
                    <span className="badge badge-accent" style={{ fontSize: "10px" }}>{roleLabel}</span>
                  )}
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                  <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{workspace}</span>
                </div>
              </div>
              {/* Menu items - role-specific quick links */}
              {(() => {
                // Get role-specific quick links for profile menu
                const roleQuickLinks: { icon: string; label: string; href: string }[] = [];
                roleQuickLinks.push({ icon: "⚙️", label: "Settings", href: "/settings" });

                // Add role-specific links
                switch (user?.role) {
                  case "underwriter":
                    roleQuickLinks.push({ icon: "📋", label: "Risk Assessment", href: "/dashboard/underwriter" });
                    roleQuickLinks.push({ icon: "📈", label: "Analytics", href: "/analytics" });
                    break;
                  case "claims_adjuster":
                    roleQuickLinks.push({ icon: "✅", label: "Claims", href: "/claims" });
                    break;
                  case "compliance_officer":
                    roleQuickLinks.push({ icon: "🛡️", label: "Compliance", href: "/compliance" });
                    roleQuickLinks.push({ icon: "📜", label: "Audit Trail", href: "/audit" });
                    break;
                  case "fraud_analyst":
                    roleQuickLinks.push({ icon: "🔍", label: "Fraud Alerts", href: "/fraud" });
                    roleQuickLinks.push({ icon: "📜", label: "Audit Trail", href: "/audit" });
                    break;
                  default:
                    roleQuickLinks.push({ icon: "📊", label: "Dashboard", href: "/dashboard" });
                }

                return roleQuickLinks.map(({ icon, label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </Link>
                ));
              })()}
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm w-full transition-colors hover:bg-white/5"
                  style={{ color: "var(--danger)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <span>🚪</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
