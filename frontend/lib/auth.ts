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
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("insurai_onboarded") === "true";
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
