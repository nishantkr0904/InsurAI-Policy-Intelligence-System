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
  // First check global flag (updated on login for returning users)
  if (localStorage.getItem("insurai_onboarded") === "true") return true;
  // Fallback: check the current user's stored onboarding status
  const user = getUser();
  if (user?.email) {
    return isUserOnboarded(user.email);
  }
  return false;
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
  // Keep the user object's role in sync so the Navbar reflects the selection.
  const user = getUser();
  if (user) {
    user.role = role;
    localStorage.setItem("insurai_user", JSON.stringify(user));
  }
}

export function getSelectedRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("insurai_user_role");
}

/** Save workspace details, link them to the current user, and mark onboarding complete. */
export function saveWorkspace(company: string, workspaceName: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("insurai_company", company);
  const user = getUser();
  if (user) {
    user.workspace = workspaceName;
    // Persist the selected role into the user profile on onboarding completion.
    const selectedRole = getSelectedRole();
    if (selectedRole) user.role = selectedRole;
    localStorage.setItem("insurai_user", JSON.stringify(user));
    // Mark user as onboarded in their registration record (per-user tracking)
    markUserOnboarded(user.email, workspaceName, selectedRole || undefined);
  }
  completeOnboarding(workspaceName);
}

/** Get the current workspace ID from localStorage. */
export function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  const user = getUser();
  return user?.workspace || null;
}

/**
 * Check if the current user is a demo user.
 * Demo users (demo@insurai.ai) use mock data instead of real API calls.
 */
export function isDemoUser(): boolean {
  const user = getUser();
  return user?.email === "demo@insurai.ai";
}

// ─────────────────────────────────────────────────────────────────────────────
// User Registration & Credential Storage (localStorage-based for demo/dev)
// In production, this would be replaced by Keycloak or backend auth.
// ─────────────────────────────────────────────────────────────────────────────

interface RegisteredUser {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  onboarded: boolean;
  workspace?: string;
  role?: string;
}

const REGISTERED_USERS_KEY = "insurai_registered_users";
const DEMO_EMAIL = "demo@insurai.ai";
const DEMO_PASSWORD = "demo1234";

/**
 * Simple hash function for password storage (NOT cryptographically secure).
 * For production, use proper backend authentication with bcrypt/argon2.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add salt-like prefix for basic obfuscation
  return `sh_${Math.abs(hash).toString(36)}_${str.length}`;
}

/** Get all registered users from localStorage. */
function getRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(REGISTERED_USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RegisteredUser[];
  } catch {
    return [];
  }
}

/** Save registered users to localStorage. */
function saveRegisteredUsers(users: RegisteredUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

/**
 * Mark a registered user as onboarded.
 * Stores the onboarding status in the user's registration record.
 */
export function markUserOnboarded(email: string, workspace?: string, role?: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === DEMO_EMAIL) {
    // Demo user uses global flag
    localStorage.setItem("insurai_onboarded", "true");
    return;
  }

  const users = getRegisteredUsers();
  const userIndex = users.findIndex((u) => u.email === normalizedEmail);
  if (userIndex !== -1) {
    users[userIndex].onboarded = true;
    if (workspace) users[userIndex].workspace = workspace;
    if (role) users[userIndex].role = role;
    saveRegisteredUsers(users);
  }
  // Also set global flag for current session
  localStorage.setItem("insurai_onboarded", "true");
}

/**
 * Check if a registered user has completed onboarding.
 */
export function isUserOnboarded(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === DEMO_EMAIL) {
    // Demo user checks global flag
    return localStorage.getItem("insurai_onboarded") === "true";
  }

  const users = getRegisteredUsers();
  const foundUser = users.find((u) => u.email === normalizedEmail);
  return foundUser?.onboarded === true;
}

/**
 * Register a new user with email and password.
 * Returns { success, error } object.
 */
export function registerUser(
  email: string,
  password: string,
  name = ""
): { success: boolean; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if email is demo email
  if (normalizedEmail === DEMO_EMAIL) {
    return { success: false, error: "This email is reserved for demo purposes." };
  }

  // Check if user already exists
  const users = getRegisteredUsers();
  if (users.some((u) => u.email === normalizedEmail)) {
    return { success: false, error: "An account with this email already exists." };
  }

  // Register new user
  const newUser: RegisteredUser = {
    email: normalizedEmail,
    passwordHash: simpleHash(password),
    name,
    createdAt: new Date().toISOString(),
    onboarded: false,
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  return { success: true };
}

/**
 * Validate login credentials against registered users.
 * Returns { success, user, error } object.
 * Also restores onboarding status for returning users.
 */
export function validateCredentials(
  email: string,
  password: string
): { success: boolean; user?: InsurAIUser; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();

  // Check demo credentials first
  if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
    return {
      success: true,
      user: {
        name: "Demo User",
        email: DEMO_EMAIL,
        role: "admin",
        workspace: localStorage.getItem("insurai_workspace") ?? "default",
        initials: "DU",
      },
    };
  }

  // Check registered users
  const users = getRegisteredUsers();
  const foundUser = users.find((u) => u.email === normalizedEmail);

  if (!foundUser) {
    return { success: false, error: "No account found with this email." };
  }

  // Validate password
  if (foundUser.passwordHash !== simpleHash(password)) {
    return { success: false, error: "Invalid password." };
  }

  // Restore onboarding status for returning users
  if (foundUser.onboarded) {
    localStorage.setItem("insurai_onboarded", "true");
    if (foundUser.workspace) {
      localStorage.setItem("insurai_workspace", foundUser.workspace);
    }
    if (foundUser.role) {
      localStorage.setItem("insurai_user_role", foundUser.role);
    }
  }

  // Return user data
  return {
    success: true,
    user: {
      name: foundUser.name || normalizedEmail.split("@")[0],
      email: foundUser.email,
      role: foundUser.role || localStorage.getItem("insurai_user_role") || "",
      workspace: foundUser.workspace || localStorage.getItem("insurai_workspace") ?? "default",
      initials: getInitials(foundUser.name || normalizedEmail.split("@")[0]),
    },
  };
}

/**
 * Check if any users are registered (for debugging/verification).
 */
export function getRegisteredUserCount(): number {
  return getRegisteredUsers().length;
}

/**
 * Check if a user with given email exists.
 */
export function isUserRegistered(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === DEMO_EMAIL) return true;
  return getRegisteredUsers().some((u) => u.email === normalizedEmail);
}
