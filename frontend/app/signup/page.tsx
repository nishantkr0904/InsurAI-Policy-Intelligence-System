"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, isAuthenticated } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: "", color: "" };
    const hasLen  = pw.length >= 8;
    const hasNum  = /[0-9]/.test(pw);
    const hasLetter = /[a-zA-Z]/.test(pw);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
    const score = [hasLen, hasNum, hasLetter, hasSpecial].filter(Boolean).length;
    if (score <= 1) return { score: 1, label: "Weak",   color: "var(--danger)" };
    if (score === 2) return { score: 2, label: "Fair",   color: "var(--warning)" };
    if (score === 3) return { score: 3, label: "Good",   color: "#4ade80" };
    return              { score: 4, label: "Strong", color: "var(--success)" };
  }

  const strength = getStrength(form.password);

  useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.email.trim()) { setError("Email address is required."); return; }
    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(form.password)) {
      setError("Password must contain at least 1 letter.");
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError("Password must contain at least 1 number.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));

    const workspace = "default";
    login({
      name: "",
      email: form.email.trim().toLowerCase(),
      role: "underwriter",
      workspace,
      initials: "",
    });

    // Store workspace and mark as NOT yet onboarded so they go through setup
    localStorage.setItem("insurai_workspace", workspace);
    localStorage.removeItem("insurai_onboarded");

    // Redirect to onboarding flow (root '/' triggers OnboardingGate → OnboardingFlow)
    router.push("/");
  }

  return (
    <div
      className="flex-1 flex items-center justify-center px-6 py-4"
      style={{ background: "var(--bg-base)", minHeight: "100%" }}
    >
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)",
          width: "700px", height: "400px",
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.1) 0%, transparent 70%)",
        }} />
      </div>

      <div className="w-full max-w-md relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="text-center mb-4">
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-gradient)", boxShadow: "var(--shadow-accent)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z"
                  fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">InsurAI</span>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Create your account
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>

          {/* SSO buttons */}
          <div className="flex flex-col gap-2 mb-4">
            <button
              type="button"
              data-testid="sso-google"
              className="flex items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{ background: "var(--bg-elevated, var(--bg-base))", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              data-testid="sso-microsoft"
              className="flex items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{ background: "var(--bg-elevated, var(--bg-base))", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
                <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
                <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
                <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
              </svg>
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>or sign up with email</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            <div>
              <label className="form-label">Work Email</label>
              <input type="email" className="input" placeholder="jane@company.com"
                value={form.email} onChange={(e) => update("email", e.target.value)} autoFocus />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input type="password" className="input" placeholder="Min. 8 characters"
                value={form.password} onChange={(e) => update("password", e.target.value)} />
              {form.password && (
                <div data-testid="password-strength" className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: s <= strength.score ? strength.color : "var(--border)" }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Confirm Password</label>
              <input type="password" className="input" placeholder="Re-enter password"
                value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--danger-soft)", border: "1px solid rgba(248,81,73,0.3)", color: "var(--danger)" }}>
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
                  <svg data-testid="submit-spinner" className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                "Create Account → Continue Setup"
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: "var(--text-muted)" }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-4 mt-3" style={{ flexWrap: "wrap" }}>
          {[
            { icon: "🔒", label: "SOC2 Type II" },
            { icon: "🔐", label: "AES-256 Encryption" },
            { icon: "✅", label: "Role-Based Access Control" },
          ].map(({ icon, label }) => (
            <span
              key={label}
              data-testid={`trust-badge-${label}`}
              style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}
            >
              {icon} {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
