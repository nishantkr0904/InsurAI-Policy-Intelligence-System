"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_ROLES, saveSelectedRole, getSelectedRole, completeOnboarding } from "@/lib/auth";
import OnboardingProgress from "@/components/OnboardingProgress";

const STEPS = [
  {
    icon: "📄",
    color: "var(--accent)",
    title: "Upload your first policy",
    desc: "Start by uploading a PDF or DOCX policy document to get AI-powered insights.",
    action: "Upload Your First Policy",
    href: "/documents",
    testId: "step-action-upload",
  },
  {
    icon: "⚡",
    color: "var(--purple)",
    title: "Index policies",
    desc: "Let our AI engine index and understand your policy documents automatically.",
    action: "Index Policies",
    href: "/documents",
    testId: "step-action-index",
  },
  {
    icon: "💬",
    color: "var(--success)",
    title: "Ask a policy question",
    desc: "Ask anything in plain English and get precise, citation-backed answers.",
    action: "Ask a Policy Question",
    href: "/chat",
    testId: "step-action-ask",
  },
  {
    icon: "✅",
    color: "var(--warning)",
    title: "Validate a claim",
    desc: "Run AI-powered claim validation against your indexed policy documents.",
    action: "Validate a Claim",
    href: "/claims",
    testId: "step-action-validate",
  },
];

export default function OnboardingFlow() {
  const router = useRouter();

  // step 0 = role selection; steps 1-4 = feature onboarding
  const [step, setStep] = useState(() => {
    if (typeof window !== "undefined") {
      // If role already saved, skip role selection
      if (getSelectedRole()) {
        const saved = localStorage.getItem("insurai_onboarding_step");
        return saved ? parseInt(saved, 10) : 1;
      }
    }
    return 0;
  });

  const [selectedRole, setSelectedRole] = useState<string | null>(() => getSelectedRole());

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

  function goToStep(n: number) {
    localStorage.setItem("insurai_onboarding_step", String(n));
    setStep(n);
  }

  /** Complete onboarding and redirect to dashboard. Called by step action buttons. */
  function goToFeature() {
    completeOnboarding();
    router.push("/dashboard");
  }

  /** Mark onboarding complete and go to dashboard. */
  function launch() {
    completeOnboarding();
    router.push("/dashboard");
  }

  /* ── Role selection screen (step 0) ────────────────────────────── */
  if (step === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-16"
        style={{ background: "var(--bg-base)", minHeight: "100%" }}
      >
        <div
          data-testid="role-selection"
          className="w-full max-w-xl rounded-2xl p-10"
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

          <div className="grid grid-cols-2 gap-3">
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

  /* ── Standard onboarding steps (1–4) ───────────────────────────── */
  const current = STEPS[step - 1];

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-base)", minHeight: "100%" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-10"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Progress indicator */}
        <div data-testid="progress-indicator" className="text-center mb-8">
          <OnboardingProgress currentStep={3} />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Step {step} of 4
          </span>
          <div className="flex gap-1.5 mt-3 justify-center">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="rounded-full transition-all duration-300"
                style={{
                  width: s === step ? "28px" : "8px",
                  height: "8px",
                  background: s <= step ? "var(--accent)" : "var(--border)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            Let&apos;s get your first policy analyzed
          </h1>
        </div>

        {/* Current step card */}
        <div
          data-testid="onboarding-step"
          className="flex flex-col items-center gap-6 text-center p-6 rounded-xl mb-8"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <span style={{ fontSize: "48px" }}>{current.icon}</span>
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              {current.title}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{current.desc}</p>
          </div>
          <button
            data-testid={current.testId}
            className="btn-primary w-full py-3 text-base rounded-xl"
            style={{ background: "var(--accent-gradient)" }}
            onClick={() => goToFeature()}
          >
            {current.action} →
          </button>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            data-testid="back-step"
            className="btn-primary py-2.5 px-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            onClick={() => step === 1 ? setStep(0) : goToStep(step - 1)}
          >
            ← Back
          </button>
          {step < 4 ? (
            <button
              data-testid="next-step"
              className="btn-primary flex-1 py-2.5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onClick={() => goToStep(step + 1)}
            >
              Skip →
            </button>
          ) : (
            <button
              data-testid="launch-btn"
              className="btn-primary flex-1 py-3 text-base rounded-xl"
              style={{ background: "var(--accent-gradient)" }}
              onClick={launch}
            >
              Launch InsurAI →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
