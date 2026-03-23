"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login, isAuthenticated, registerUser } from "@/lib/auth";

function FieldError({ msg, testId, id }: { msg: string; testId: string; id: string }) {
  if (!msg) return null;
  return (
    <p id={id} data-testid={testId} role="alert" aria-live="polite" className="text-xs mt-1.5" style={{ color: "var(--danger)" }}>
      {msg}
    </p>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  function getStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: "", color: "" };
    const hasLen     = pw.length >= 8;
    const hasNum     = /[0-9]/.test(pw);
    const hasLetter  = /[a-zA-Z]/.test(pw);
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

  function validateEmail(value: string): string {
    if (!value.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Please enter a valid email address.";
    return "";
  }

  function validatePassword(value: string): string {
    if (!value) return "Password is required.";
    if (value.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-zA-Z]/.test(value)) return "Password must contain at least 1 letter.";
    if (!/[0-9]/.test(value)) return "Password must contain at least 1 number.";
    return "";
  }

  function validateConfirm(value: string, password: string): string {
    if (!value) return "Please confirm your password.";
    if (value !== password) return "Passwords do not match.";
    return "";
  }

  function touch(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function update(field: keyof typeof form, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);

    // Live re-validation once a field has been touched
    if (touched[field]) {
      if (field === "email") {
        setFieldErrors((e) => ({ ...e, email: validateEmail(value) }));
      } else if (field === "password") {
        const pwErr = validatePassword(value);
        const cfErr = touched.confirmPassword ? validateConfirm(next.confirmPassword, value) : fieldErrors.confirmPassword;
        setFieldErrors((e) => ({ ...e, password: pwErr, confirmPassword: cfErr }));
      } else if (field === "confirmPassword") {
        setFieldErrors((e) => ({ ...e, confirmPassword: validateConfirm(value, next.password) }));
      }
    }
    // Always re-check confirm live if already touched
    if (field === "confirmPassword" && touched.confirmPassword) {
      setFieldErrors((e) => ({ ...e, confirmPassword: validateConfirm(value, next.password) }));
    }
  }

  function handleBlur(field: keyof typeof form) {
    touch(field);
    const v = form[field];
    if (field === "email")           setFieldErrors((e) => ({ ...e, email: validateEmail(v) }));
    else if (field === "password")   setFieldErrors((e) => ({ ...e, password: validatePassword(v) }));
    else if (field === "confirmPassword") setFieldErrors((e) => ({ ...e, confirmPassword: validateConfirm(v, form.password) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Force-validate all fields
    const errors = {
      email:           validateEmail(form.email),
      password:        validatePassword(form.password),
      confirmPassword: validateConfirm(form.confirmPassword, form.password),
    };
    setFieldErrors(errors);
    setTouched({ email: true, password: true, confirmPassword: true });
    if (errors.email || errors.password || errors.confirmPassword) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));

    // Register the user
    const result = registerUser(form.email, form.password);

    if (!result.success) {
      toast.error("Registration failed", {
        description: result.error || "Please try again.",
      });
      setLoading(false);
      return;
    }

    // Log in the newly registered user
    const workspace = "default";
    login({
      name: "",
      email: form.email.trim().toLowerCase(),
      role: "",
      workspace,
      initials: "",
    });

    localStorage.setItem("insurai_workspace", workspace);
    localStorage.removeItem("insurai_onboarded");

    toast.success("Account created!", {
      description: "Redirecting to setup...",
    });

    router.push("/onboarding");
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
              className="btn-ghost w-full justify-center gap-3 rounded-xl py-2.5 text-sm"
              style={{ background: "var(--bg-elevated, var(--bg-base))", borderColor: "rgba(59,130,246,0.4)" }}
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
              className="btn-ghost w-full justify-center gap-3 rounded-xl py-2.5 text-sm"
              style={{ background: "var(--bg-elevated, var(--bg-base))", borderColor: "rgba(59,130,246,0.4)" }}
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
              <label htmlFor="signup-email" className="form-label">Work Email</label>
              <input
                id="signup-email"
                type="email"
                className="input"
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                aria-required="true"
                aria-invalid={touched.email && !!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "error-email-msg" : undefined}
                style={touched.email && fieldErrors.email ? { borderColor: "var(--danger)" } : {}}
                autoFocus
              />
              <FieldError msg={fieldErrors.email} testId="error-email" id="error-email-msg" />
            </div>

            <div>
              <label htmlFor="signup-password" className="form-label">Password</label>
              <input
                id="signup-password"
                type="password"
                className="input"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                aria-required="true"
                aria-invalid={touched.password && !!fieldErrors.password}
                aria-describedby={
                  [
                    form.password ? "password-strength-desc" : "",
                    touched.password && fieldErrors.password ? "error-password-msg" : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                style={touched.password && fieldErrors.password ? { borderColor: "var(--danger)" } : {}}
              />
              {form.password && (
                <div data-testid="password-strength" className="mt-2">
                  <div className="flex gap-1 mb-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: s <= strength.score ? strength.color : "var(--border)" }}
                      />
                    ))}
                  </div>
                  <p id="password-strength-desc" className="text-xs" style={{ color: strength.color }}>
                    Password strength: {strength.label}
                  </p>
                </div>
              )}
              <FieldError msg={touched.password ? fieldErrors.password : ""} testId="error-password" id="error-password-msg" />
            </div>

            <div>
              <label htmlFor="signup-confirm" className="form-label">Confirm Password</label>
              <input
                id="signup-confirm"
                type="password"
                className="input"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                aria-required="true"
                aria-invalid={touched.confirmPassword && !!fieldErrors.confirmPassword}
                aria-describedby={touched.confirmPassword && fieldErrors.confirmPassword ? "error-confirm-msg" : undefined}
                style={touched.confirmPassword && fieldErrors.confirmPassword ? { borderColor: "var(--danger)" } : {}}
              />
              <FieldError msg={touched.confirmPassword ? fieldErrors.confirmPassword : ""} testId="error-confirm" id="error-confirm-msg" />
            </div>

            <button
              type="submit"
              className="btn-primary py-3 text-base rounded-xl"
              style={{ background: "var(--accent-gradient)", marginTop: "4px" }}
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Creating account, please wait" : "Create Account and Continue Setup"}
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


