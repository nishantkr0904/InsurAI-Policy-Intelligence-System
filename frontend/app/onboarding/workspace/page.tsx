"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSelectedRole, hydrateSession, saveWorkspace } from "@/lib/auth";
import { getRoleDefaultRoute } from "@/lib/rbac";
import OnboardingProgress from "@/components/OnboardingProgress";

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await hydrateSession();
      if (!user) {
        router.replace("/login");
        return;
      }
      setSelectedRole(getSelectedRole());
    };

    void init();
  }, [router]);

  /** Auto-derive a workspace slug from the company name */
  function deriveWorkspace(value: string) {
    setCompany(value);
    if (!workspaceName || workspaceName === slugify(company)) {
      setWorkspaceName(slugify(value));
    }
  }

  function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!company.trim()) { setError("Company or organization name is required."); return; }
    if (!workspaceName.trim()) { setError("Workspace name is required."); return; }

    setLoading(true);
    // Simulate a brief save
    await new Promise((r) => setTimeout(r, 600));

    await saveWorkspace(company.trim(), workspaceName.trim());

    // Redirect to role-specific dashboard after onboarding
    const roleRoute = getRoleDefaultRoute(getSelectedRole());
    router.push(roleRoute);
  }

  return (
    <div
      className="flex-1 flex items-center justify-center px-6 py-8"
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
        <div className="text-center mb-6">
          <OnboardingProgress currentStep={2} />
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent-gradient)", boxShadow: "var(--shadow-accent)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Set up your workspace
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Policies and team members will belong to this workspace.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
        >
          <form data-testid="workspace-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="form-label" htmlFor="ws-company">Company or Organization</label>
              <input
                id="ws-company"
                data-testid="input-company"
                className="input"
                placeholder="Acme Insurance Co."
                value={company}
                onChange={(e) => deriveWorkspace(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="form-label" htmlFor="ws-name">Workspace Name</label>
              <input
                id="ws-name"
                data-testid="input-workspace"
                className="input"
                placeholder="acme-insurance"
                value={workspaceName}
                onChange={(e) => { setWorkspaceName(e.target.value); }}
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                Used to identify your workspace — lowercase, hyphens allowed.
              </p>
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
              data-testid="workspace-submit"
              className="btn-primary py-3 text-base rounded-xl mt-1"
              style={{ background: "var(--accent-gradient)" }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg data-testid="workspace-spinner" className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creating workspace…
                </span>
              ) : (
                "Create Workspace →"
              )}
            </button>
          </form>
        </div>

        {/* Role indicator */}
        {selectedRole && (
          <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
            Setting up as <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{selectedRole.replace("_", " ")}</span>
          </p>
        )}

        {/* Back link */}
        <div className="text-center mt-4">
          <button
            data-testid="workspace-back"
            className="btn-ghost text-sm"
            onClick={() => router.push("/onboarding")}
          >
            ← Change role
          </button>
        </div>
      </div>
    </div>
  );
}
