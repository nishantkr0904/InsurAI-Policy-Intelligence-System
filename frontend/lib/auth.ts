/**
 * Shared auth utilities – localStorage-based session management.
 * In production this would be replaced by a real auth provider (JWT/OAuth).
 */

export interface InsurAIUser {
  name: string;
  email: string;
  role: string;
  workspace: string;
  initials: string;
}

export function getUser(): InsurAIUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("insurai_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InsurAIUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("insurai_auth") === "true";
}

export function login(user: InsurAIUser): void {
  localStorage.setItem("insurai_auth", "true");
  localStorage.setItem("insurai_user", JSON.stringify(user));
}

export function logout(): void {
  localStorage.removeItem("insurai_auth");
  localStorage.removeItem("insurai_user");
  localStorage.removeItem("insurai_onboarded");
  localStorage.removeItem("insurai_workspace");
  localStorage.removeItem("insurai_user_role");
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("insurai_onboarded") === "true";
}

/** Mark onboarding as complete and clean up step state. */
export function completeOnboarding(workspace = "default"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("insurai_onboarded", "true");
  localStorage.setItem("insurai_workspace", workspace);
  localStorage.removeItem("insurai_onboarding_step");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const ROLES = [
  { value: "underwriter", label: "Underwriter" },
  { value: "compliance_officer", label: "Compliance Officer" },
  { value: "claims_adjuster", label: "Claims Adjuster" },
  { value: "fraud_analyst", label: "Fraud Analyst" },
  { value: "broker", label: "Broker" },
  { value: "auditor", label: "Auditor" },
  { value: "customer", label: "Customer" },
  { value: "admin", label: "Administrator" },
];

/** The four roles surfaced during onboarding role-selection. */
export const ONBOARDING_ROLES = [
  { value: "underwriter",         label: "Underwriter",         icon: "📋", desc: "Risk assessment & policy underwriting" },
  { value: "claims_adjuster",       label: "Claims Adjuster",      icon: "✅", desc: "Validate and process insurance claims" },
  { value: "compliance_officer",  label: "Compliance Officer",   icon: "🛡️", desc: "Regulatory monitoring & audit reports" },
  { value: "fraud_analyst",       label: "Fraud Analyst",        icon: "🔍", desc: "Detect and investigate fraud patterns" },
] as const;

export type OnboardingRole = (typeof ONBOARDING_ROLES)[number]["value"];

export function saveSelectedRole(role: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("insurai_user_role", role);
}

export function getSelectedRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("insurai_user_role");
}
