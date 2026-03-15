"use client";

import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/chat",       label: "Chat" },
  { href: "/documents",  label: "Documents" },
  { href: "/claims",     label: "Claims" },
  { href: "/fraud",      label: "Fraud" },
  { href: "/compliance", label: "Compliance" },
  { href: "/dashboard",  label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname.startsWith("/dashboard");
    return pathname === href || pathname.startsWith(href + "/");
  }

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
      {/* Brand */}
      <a href="/" className="flex items-center gap-2.5 shrink-0" style={{ textDecoration: "none" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "var(--accent-gradient)",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z"
              fill="rgba(255,255,255,0.25)"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          className="font-bold text-sm tracking-tight gradient-text"
          style={{ letterSpacing: "-0.01em" }}
        >
          InsurAI
        </span>
        <span className="badge badge-accent">Beta</span>
      </a>

      {/* Navigation */}
      <nav className="flex items-center gap-0.5">
        {NAV_LINKS.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <a
              key={href}
              href={href}
              className="relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                background: active ? "rgba(59,130,246,0.1)" : "transparent",
                textDecoration: "none",
              }}
            >
              {label}
              {active && (
                <span
                  className="absolute bottom-0 left-3.5 right-3.5 h-0.5 rounded-full"
                  style={{ background: "var(--accent-gradient)" }}
                />
              )}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
