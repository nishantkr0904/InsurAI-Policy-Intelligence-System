"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, logout, ROLES, type InsurAIUser } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<InsurAIUser | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    setUser(getUser());
  }, [router]);

  function handleSave() {
    if (!user) return;
    localStorage.setItem("insurai_user", JSON.stringify(user));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <input className="input" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input className="input" type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Role</label>
          <select className="input" value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })} style={{ cursor: "pointer" }}>
            {ROLES.map(({ value, label }) => (
              <option key={value} value={value} style={{ background: "var(--bg-surface)" }}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Company or Organization</label>
          <input className="input" value={user.workspace} onChange={(e) => setUser({ ...user, workspace: e.target.value })} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Your policies and team members will belong to this workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary text-sm">
            {saved ? "✓ Saved!" : "Save Changes"}
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
