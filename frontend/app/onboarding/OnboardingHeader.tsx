"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const TOTAL_STEPS = 4;

/** Minimal header rendered by the onboarding layout. */
export default function OnboardingHeader() {
  const pathname = usePathname();
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (pathname === "/policies/upload") {
      setStep(3);
      return;
    }
    if (pathname === "/chat") {
      setStep(4);
      return;
    }
    setStep(null);
  }, [pathname]);

  return (
    <header
      data-testid="onboarding-header"
      className="shrink-0 flex items-center justify-between px-6 border-b"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-surface)",
        height: "60px",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 shrink-0"
        style={{ textDecoration: "none" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent-gradient)", boxShadow: "var(--shadow-accent)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z"
              fill="rgba(255,255,255,0.25)"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          className="font-bold text-sm tracking-tight gradient-text"
          style={{ letterSpacing: "-0.01em" }}
        >
          InsurAI
        </span>
      </Link>

      {/* Progress dots – only visible during feature onboarding steps 1-4 */}
      {step !== null && (
        <div
          data-testid="onboarding-progress"
          className="flex items-center gap-1.5"
          aria-label={`Onboarding step ${step} of ${TOTAL_STEPS}`}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: s === step ? "20px" : "6px",
                height: "6px",
                background: s <= step ? "var(--accent)" : "var(--border)",
              }}
            />
          ))}
          <span
            className="text-xs ml-2"
            style={{ color: "var(--text-muted)" }}
          >
            {step}/{TOTAL_STEPS}
          </span>
        </div>
      )}
    </header>
  );
}
