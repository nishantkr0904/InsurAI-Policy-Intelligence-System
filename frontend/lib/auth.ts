/**
 * Auth/session utilities backed by secure HTTP-only cookie sessions.
 * Runtime user state is held in memory only (no local/session/indexed storage).
 */

import {
  acknowledgeFirstLogin,
  completeUserOnboarding,
  fetchCurrentUser,
  loginUser as apiLoginUser,
  LoginResponse,
  logoutUser as apiLogoutUser,
  registerUser as apiRegisterUser,
} from "./api";

export interface InsurAIUser {
  name: string;
  email: string;
  role: string;
  workspace: string;
  initials: string;
  onboarded?: boolean;
  firstLoginShown?: boolean;
}

let sessionUser: InsurAIUser | null = null;
let selectedRole: string | null = null;

function mapLoginResponseUser(response: NonNullable<LoginResponse["user"]>): InsurAIUser {
  return {
    name: response.name,
    email: response.email,
    role: response.role || "",
    workspace: response.workspace || "",
    initials: response.initials,
    onboarded: response.onboarded,
    firstLoginShown: response.first_login_shown,
  };
}

export async function hydrateSession(force = false): Promise<InsurAIUser | null> {
  if (!force && sessionUser) return sessionUser;

  try {
    const response = await fetchCurrentUser();
    if (!response.success || !response.user) {
      sessionUser = null;
      return null;
    }
    sessionUser = mapLoginResponseUser(response.user);
    if (sessionUser.role) selectedRole = sessionUser.role;
    return sessionUser;
  } catch {
    sessionUser = null;
    return null;
  }
}

export function getUser(): InsurAIUser | null {
  return sessionUser;
}

export function isAuthenticated(): boolean {
  return sessionUser !== null;
}

export function login(user: InsurAIUser): void {
  sessionUser = user;
  if (user.role) selectedRole = user.role;
}

export function logout(): void {
  sessionUser = null;
  selectedRole = null;
  void apiLogoutUser();
}

export function isOnboarded(): boolean {
  return sessionUser?.onboarded === true;
}

/** Mark onboarding as complete and clean up step state. */
export function completeOnboarding(workspace = "default"): void {
  if (!sessionUser) return;
  sessionUser = { ...sessionUser, onboarded: true, workspace };
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
  selectedRole = role;
  if (sessionUser) sessionUser = { ...sessionUser, role };
}

export function getSelectedRole(): string | null {
  return selectedRole || sessionUser?.role || null;
}

/** Save workspace details, link them to the current user, and mark onboarding complete. */
export async function saveWorkspace(company: string, workspaceName: string): Promise<void> {
  void company; // retained for API compatibility with existing call sites

  if (sessionUser) {
    const role = getSelectedRole() || undefined;
    const updated = await completeUserOnboarding(sessionUser.email, {
      workspace: workspaceName,
      role,
    });
    sessionUser = {
      name: updated.name,
      email: updated.email,
      role: updated.role || role || "",
      workspace: updated.workspace || workspaceName,
      initials: updated.initials,
      onboarded: updated.onboarded,
      firstLoginShown: !updated.onboarded ? false : undefined,
    };
    if (sessionUser.role) selectedRole = sessionUser.role;
  }

  completeOnboarding(workspaceName);
}

/** Get the current workspace ID from active session. */
export function getWorkspaceId(): string | null {
  return sessionUser?.workspace || null;
}

/**
 * Check if the current user is a demo user.
 * Demo users (demo@insurai.ai) use mock data instead of real API calls.
 */
export function isDemoUser(): boolean {
  const user = getUser();
  return user?.email === "demo@insurai.ai";
}

/**
 * Register a new user with email and password via backend API.
 * Returns { success, error } object.
 */
export async function registerUser(
  email: string,
  password: string,
  name = ""
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiRegisterUser({ email, password, name });
    
    return {
      success: response.success,
      error: response.error || undefined,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: "Unable to connect to authentication server." 
    };
  }
}

/**
 * Validate login credentials against backend API.
 * Returns { success, user, error } object.
 * Also restores onboarding status for returning users.
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; user?: InsurAIUser; onboarded?: boolean; error?: string }> {
  try {
    const response: LoginResponse = await apiLoginUser({ email, password });
    
    if (!response.success || !response.user) {
      return { 
        success: false, 
        error: response.error || "Login failed." 
      };
    }
    
    // Convert backend UserResponse to InsurAIUser format
    const user: InsurAIUser = mapLoginResponseUser(response.user);
    sessionUser = user;
    if (user.role) selectedRole = user.role;

    return { success: true, user, onboarded: response.user.onboarded };
  } catch (error) {
    console.error("Login error:", error);
    return { 
      success: false, 
      error: "Unable to connect to authentication server." 
    };
  }
}

/**
 * Check if this is the user's first login (after onboarding).
 * Returns true if the user has never seen the welcome message before.
 */
export function isFirstLogin(email?: string): boolean {
  void email;
  if (!sessionUser?.onboarded) return false;
  return sessionUser.firstLoginShown !== true;
}

/**
 * Mark the first login welcome message as shown.
 * After this, isFirstLogin() will return false.
 */
export function markFirstLoginShown(email?: string): void {
  void email;
  if (!sessionUser) return;
  sessionUser = { ...sessionUser, firstLoginShown: true };
  void acknowledgeFirstLogin();
}
