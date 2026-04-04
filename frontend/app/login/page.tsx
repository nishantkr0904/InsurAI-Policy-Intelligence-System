"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login, isAuthenticated, validateCredentials, getUser } from "@/lib/auth";
import { getRoleDefaultRoute } from "@/lib/rbac";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      // Redirect to role-specific route if already logged in
      const user = getUser();
      router.replace(getRoleDefaultRoute(user?.role || null));
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      toast.error("Please enter your email and password");
      return;
    }

    setLoading(true);

    // Validate credentials against backend API and demo account
    const result = await validateCredentials(email, password);
    if (!result.success) {
      setError(result.error || "Invalid email or password. Please try again.");
      toast.error("Invalid credentials", {
        description: result.error || "Please check your email and password",
      });
      setLoading(false);
      return;
    }

    // Log in the validated user
    login(result.user!);

    toast.success("Welcome back!", {
      description: "Redirecting to your dashboard...",
    });

    // Backend onboarding status is authoritative and avoids stale localStorage redirects.
    if (result.onboarded === false) {
      router.push("/onboarding");
    } else {
      const roleRoute = getRoleDefaultRoute(result.user!.role || null);
      router.push(roleRoute);
    }
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-3 overflow-y-auto"
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
        <div className="text-center mb-3">
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
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
          className="rounded-2xl p-4"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          {/* SSO buttons */}
          <div className="flex flex-col gap-2 mb-3">
            <button
              type="button"
              data-testid="sso-google"
              className="btn-ghost w-full py-2 rounded-xl text-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
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
              className="btn-ghost w-full py-2 rounded-xl text-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
                <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
                <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
                <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
              </svg>
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or sign in with email</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  data-testid="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute", right: "10px", top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", fontSize: "12px", padding: "2px 4px",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <span data-testid="forgot-password" style={{ fontSize: "12px", color: "var(--accent)", cursor: "pointer" }}>
                  Forgot password?
                </span>
              </div>
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
              className="btn-primary py-2.5 text-base rounded-xl"
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

          {/* Demo credentials hint */}
          <div
            className="mt-2 rounded-lg px-3 py-2"
            style={{ background: "var(--accent-soft)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <p className="text-xs" style={{ color: "var(--accent)" }}>
              <strong>Demo credentials:</strong> demo@insurai.ai / demo1234
            </p>
          </div>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-4 mt-2" style={{ flexWrap: "wrap" }}>
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
