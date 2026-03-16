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
