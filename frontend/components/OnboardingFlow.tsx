"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [step, setStep] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("insurai_onboarding_step");
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  function goToStep(n: number) {
    localStorage.setItem("insurai_onboarding_step", String(n));
    setStep(n);
  }

  /** Navigate to a feature page, preserving onboarding state so Back works. */
  function goToFeature(href: string) {
    localStorage.setItem("insurai_workspace", "default");
    localStorage.setItem("insurai_onboarding_step", String(step));
    router.push(href);
  }

  /** Mark onboarding complete and go to dashboard. */
  function launch() {
    localStorage.setItem("insurai_workspace", "default");
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.removeItem("insurai_onboarding_step");
    router.push("/dashboard");
  }

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
            onClick={() => goToFeature(current.href)}
          >
            {current.action} →
          </button>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              data-testid="back-step"
              className="btn-primary py-2.5 px-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={() => goToStep(step - 1)}
            >
              ← Back
            </button>
          )}
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
