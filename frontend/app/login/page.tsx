"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, isAuthenticated, getInitials } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 800));

    const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    login({
      name,
      email: email.trim().toLowerCase(),
      role: "admin",
      workspace: localStorage.getItem("insurai_workspace") ?? "default",
      initials: getInitials(name),
    });

    // If never onboarded, go through workspace setup
    const onboarded = localStorage.getItem("insurai_onboarded") === "true";
    router.push(onboarded ? "/dashboard" : "/");
  }

  return (
    <div
      className="flex-1 flex items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-base)", minHeight: "100%" }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background:
              "radial-gradient(ellipse at center, rgba(59,130,246,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div className="w-full max-w-md relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent-gradient)", boxShadow: "var(--shadow-accent)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z"
                  fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">InsurAI</span>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Sign in to your account
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Start free trial
            </Link>
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <span style={{ fontSize: "12px", color: "var(--accent)", cursor: "pointer" }}>
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--danger-soft)", border: "1px solid rgba(248,81,73,0.3)", color: "var(--danger)" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary py-3 text-base rounded-xl"
              style={{ background: "var(--accent-gradient)", marginTop: "4px" }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div
            className="mt-5 rounded-lg px-4 py-3"
            style={{ background: "var(--accent-soft)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <p className="text-xs" style={{ color: "var(--accent)" }}>
              <strong>Demo:</strong> Enter any email and password to sign in.
            </p>
          </div>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-4 mt-6" style={{ flexWrap: "wrap" }}>
          {["🔒 SOC2", "🛡️ PII Protected", "🔐 Encrypted"].map((badge) => (
            <span key={badge} style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
