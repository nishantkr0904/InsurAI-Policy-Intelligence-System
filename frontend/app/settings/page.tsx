"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, hydrateSession, logout, type InsurAIUser } from "@/lib/auth";
import { updateCurrentUser } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<InsurAIUser | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    workspace: "",
  });

  useEffect(() => {
    const init = async () => {
      const currentUser = await hydrateSession();
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      if (!currentUser.onboarded) {
        router.replace("/onboarding");
        return;
      }
      const loadedUser = getUser();
      setUser(loadedUser);
      if (loadedUser) {
        setForm({
          name: loadedUser.name ?? "",
          email: loadedUser.email ?? "",
          workspace: loadedUser.workspace ?? "",
        });
      }
    };

    void init();
  }, [router]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await updateCurrentUser({
        name: form.name.trim(),
        email: form.email.trim(),
        workspace: form.workspace.trim(),
      });

      if (!response.success || !response.user) {
        setError(response.error || "Unable to save settings.");
        return;
      }

      const updatedUser: InsurAIUser = {
        name: response.user.name,
        email: response.user.email,
        role: response.user.role || "",
        workspace: response.user.workspace || "",
        initials: response.user.initials,
        onboarded: response.user.onboarded,
        firstLoginShown: response.user.first_login_shown,
      };

      setUser(updatedUser);
      setForm({
        name: updatedUser.name,
        email: updatedUser.email,
        workspace: updatedUser.workspace,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await hydrateSession(true);
    } catch (e) {
      setError((e as Error).message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Manage your account and workspace preferences</p>
      </div>

      <div className="card space-y-5">
        <h2 className="section-title">Profile</h2>

        <div>
          <label className="form-label">Full Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
        </div>
        <div>
          <label className="form-label">Role</label>
          <input className="input" value={user.role || "Not assigned"} readOnly aria-readonly="true" />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Role is managed by admin.
          </p>
        </div>
        <div>
          <label className="form-label">Company or Organization</label>
          <input className="input" value={form.workspace} onChange={(e) => setForm((prev) => ({ ...prev, workspace: e.target.value }))} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Your policies and team members will belong to this workspace.
          </p>
        </div>

        {error && (
          <p className="text-xs rounded px-3 py-2" style={{ color: "var(--danger)", background: "var(--danger-soft)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary text-sm" disabled={saving}>
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
          </button>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="btn-secondary text-sm"
            style={{ color: "var(--danger)", borderColor: "rgba(248,81,73,0.3)" }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Security</h2>
        <div className="flex flex-wrap gap-3 mt-2">
          {["🔒 SOC2 Compliant", "🛡️ PII Protected", "🔐 AES-256 Encrypted", "✅ RBAC Enabled"].map((b) => (
            <span key={b} className="chip">{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
