"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_ROLES, saveSelectedRole, getSelectedRole } from "@/lib/auth";
import OnboardingProgress from "@/components/OnboardingProgress";

export default function OnboardingFlow() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    // Pre-populate from a previously saved role (e.g., user pressed Back)
    const saved = getSelectedRole();
    if (saved) setSelectedRole(saved);
  }, []);

  /** Select a role card – persists immediately but does NOT navigate yet. */
  function selectRole(role: string) {
    setSelectedRole(role);
    saveSelectedRole(role);
  }

  /** Confirm the chosen role and proceed to workspace setup. */
  function confirmRole() {
    if (!selectedRole) return;
    router.push("/onboarding/workspace");
  }

  /* ── Role selection screen ──────────────────────────────────────── */
  return (
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-16"
        style={{ background: "var(--bg-base)", minHeight: "100%" }}
      >
        <div
          data-testid="role-selection"
          className="w-full max-w-[900px] rounded-2xl p-10"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div className="text-center mb-8">
            <OnboardingProgress currentStep={1} />
            <h1 className="text-3xl font-bold tracking-tight gradient-text mb-2">
              What&apos;s your role?
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Select your role so we can tailor InsurAI to your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ONBOARDING_ROLES.map(({ value, label, icon, desc }) => {
              const isSelected = selectedRole === value;
              return (
                <button
                  key={value}
                  data-testid={`role-option-${value}`}
                  onClick={() => selectRole(value)}
                  className="relative flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all duration-150 hover:scale-[1.02] hover:shadow-lg"
                  style={{
                    background: isSelected ? "var(--accent-soft)" : "var(--bg-card)",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 0 0 3px rgba(59,130,246,0.15)" : undefined,
                  }}
                >
                  {/* Check icon – only visible when selected */}
                  {isSelected && (
                    <span
                      data-testid={`role-check-${value}`}
                      className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full"
                      style={{ background: "var(--accent)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                  <span style={{ fontSize: "28px" }}>{icon}</span>
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
                  <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</span>
                </button>
              );
            })}
          </div>

          {/* Continue button – enabled only once a role is selected */}
          <button
            data-testid="role-continue"
            onClick={confirmRole}
            disabled={!selectedRole}
            className="mt-6 w-full btn-primary py-3 text-base rounded-xl transition-opacity duration-150"
            style={{
              background: selectedRole ? "var(--accent-gradient)" : undefined,
              opacity: selectedRole ? 1 : 0.4,
              cursor: selectedRole ? "pointer" : "not-allowed",
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    );
}
