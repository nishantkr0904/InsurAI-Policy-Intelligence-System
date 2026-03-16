/**
 * OnboardingProgress – horizontal step tracker shown throughout the onboarding flow.
 *
 * Steps:
 *   1 – Role
 *   2 – Workspace
 *   3 – Upload Policy
 *
 * Pass `currentStep` (1 | 2 | 3) to highlight the active step.
 * Steps before currentStep are rendered as "done"; steps after are "pending".
 */

const STEPS = [
  { id: 1, label: "Role",          icon: "👤" },
  { id: 2, label: "Workspace",     icon: "🏢" },
  { id: 3, label: "Upload Policy", icon: "📄" },
] as const;

type StepStatus = "done" | "active" | "pending";

interface Props {
  currentStep: 1 | 2 | 3;
}

export default function OnboardingProgress({ currentStep }: Props) {
  return (
    <div
      data-testid="onboarding-progress-bar"
      className="flex items-center justify-center gap-0 mb-8"
      aria-label="Onboarding progress"
    >
      {STEPS.map(({ id, label, icon }, index) => {
        const status: StepStatus =
          id < currentStep ? "done" : id === currentStep ? "active" : "pending";

        const isLast = index === STEPS.length - 1;

        return (
          <div key={id} className="flex items-center">
            {/* Step node */}
            <div
              data-testid={`progress-step-${id}`}
              data-status={status}
              className="flex flex-col items-center gap-1.5"
              aria-current={status === "active" ? "step" : undefined}
            >
              {/* Circle */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200"
                style={
                  status === "done"
                    ? {
                        background: "var(--accent)",
                        color: "#fff",
                        boxShadow: "0 0 0 3px rgba(59,130,246,0.15)",
                      }
                    : status === "active"
                    ? {
                        background: "var(--accent-gradient)",
                        color: "#fff",
                        boxShadow: "0 0 0 4px rgba(59,130,246,0.25)",
                      }
                    : {
                        background: "var(--bg-card)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {status === "done" ? (
                  /* Checkmark */
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span style={{ fontSize: "14px" }}>{icon}</span>
                )}
              </div>

              {/* Label */}
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{
                  color:
                    status === "active"
                      ? "var(--text-primary)"
                      : status === "done"
                      ? "var(--accent)"
                      : "var(--text-muted)",
                }}
              >
                {label}
              </span>
            </div>

            {/* Connector line between steps */}
            {!isLast && (
              <div
                className="mx-3 transition-all duration-200"
                style={{
                  width: "48px",
                  height: "2px",
                  background:
                    id < currentStep ? "var(--accent)" : "var(--border)",
                  marginBottom: "18px", // align with circle centres
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
