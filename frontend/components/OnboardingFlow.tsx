"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [workspace, setWorkspace] = useState("default");

  function launch() {
    localStorage.setItem("insurai_workspace", workspace || "default");
    localStorage.setItem("insurai_onboarded", "true");
    router.push("/dashboard");
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-base)", minHeight: "100%" }}
    >
      {/* Card container */}
      <div
        className="w-full max-w-xl rounded-2xl p-10"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}
      >
        {step === 1 && <StepWelcome onNext={() => setStep(2)} />}
        {step === 2 && <StepHowItWorks onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && (
          <StepReady
            workspace={workspace}
            onWorkspaceChange={setWorkspace}
            onBack={() => setStep(2)}
            onLaunch={launch}
          />
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: s === step ? "28px" : "8px",
                height: "8px",
                background: s === step ? "var(--accent)" : "var(--border)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Welcome ──────────────────────────────────────── */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-8">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          background: "var(--accent-gradient)",
          boxShadow: "0 0 40px rgba(37,99,235,0.5)",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z"
            fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight gradient-text">Welcome to InsurAI</h1>
        <p className="text-base" style={{ color: "var(--text-secondary)" }}>
          Corporate Policy Automation &amp; Intelligence System
        </p>
      </div>

      {/* Workflow cards – 4-step process */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {[
          { step: "1", icon: "📄", label: "Upload Policies", color: "var(--accent)" },
          { step: "2", icon: "⚡", label: "AI Indexing",     color: "var(--purple)" },
          { step: "3", icon: "💬", label: "Ask Questions",   color: "var(--success)" },
          { step: "4", icon: "✅", label: "Validate Claims", color: "var(--warning)" },
        ].map(({ step, icon, label, color }) => (
          <div
            key={step}
            className="flex flex-col items-center gap-1.5 rounded-xl py-4 px-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <span style={{ fontSize: "22px" }}>{icon}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${color}1a`, color }}
            >
              Step {step}
            </span>
            <span className="text-xs text-center font-medium" style={{ color: "var(--text-secondary)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <button
        data-testid="get-started"
        onClick={onNext}
        className="btn-primary w-full py-3 text-base rounded-xl"
        style={{ background: "var(--accent-gradient)" }}
      >
        Get Started →
      </button>
    </div>
  );
}

/* ── Step 2: How It Works ─────────────────────────────────── */
function StepHowItWorks({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      title: "Upload Policies",
      desc: "Drag & drop PDF or DOCX policy documents to get started instantly.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: "Ask Questions",
      desc: "Ask anything in plain English. Get precise, citation-backed answers.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
      title: "Verify Sources",
      desc: "Every answer links to the exact policy clause. Zero guesswork.",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          How It Works
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>Three simple steps to policy intelligence</p>
      </div>

      <div className="flex flex-col gap-4">
        {features.map(({ icon, title, desc }, i) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(37,99,235,0.15)", color: "var(--accent)" }}
            >
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {i + 1}
                </span>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          className="btn-primary flex-1 py-2.5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          data-testid="next-step"
          className="btn-primary flex-1 py-2.5"
          style={{ background: "var(--accent-gradient)" }}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Ready to Go ──────────────────────────────────── */
function StepReady({
  workspace,
  onWorkspaceChange,
  onBack,
  onLaunch,
}: {
  workspace: string;
  onWorkspaceChange: (v: string) => void;
  onBack: () => void;
  onLaunch: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      {/* Checkmark icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          boxShadow: "0 0 40px rgba(34,197,94,0.4)",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold gradient-text">You&apos;re all set!</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Your AI policy analyst is ready. Set a workspace name to begin.
        </p>
      </div>

      <div className="w-full space-y-2 text-left">
        <label className="text-sm font-medium block" style={{ color: "var(--text-secondary)" }}>
          Workspace Name
        </label>
        <input
          className="input"
          data-testid="workspace-input"
          value={workspace}
          onChange={(e) => onWorkspaceChange(e.target.value)}
          placeholder="default"
        />
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          This groups your uploaded documents. You can change it later.
        </p>
      </div>

      <div className="flex gap-3 w-full">
        <button
          className="btn-primary flex-1 py-2.5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          data-testid="launch-btn"
          className="btn-primary flex-1 py-3 text-base rounded-xl"
          style={{ background: "var(--accent-gradient)" }}
          onClick={onLaunch}
        >
          Launch InsurAI →
        </button>
      </div>
    </div>
  );
}
