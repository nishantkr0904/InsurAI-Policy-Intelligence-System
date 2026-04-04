/**
 * Role-Based Access Control (RBAC) configuration and utilities.
 * Defines which routes each role can access.
 */

export type UserRole =
  | "underwriter"
  | "claims_adjuster"
  | "compliance_officer"
  | "fraud_analyst"
  | "broker"
  | "auditor"
  | "customer"
  | "admin";

export interface NavLink {
  href: string;
  label: string;
  icon?: string;
}

/**
 * Role-specific default routes (used after login/onboarding).
 */
export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  underwriter: "/dashboard/underwriter",
  claims_adjuster: "/claims",
  compliance_officer: "/compliance",
  fraud_analyst: "/fraud",
  broker: "/documents",
  auditor: "/audit",
  customer: "/chat",
  admin: "/dashboard",
};

/**
 * Role-specific sidebar links for dashboard.
 */
export const ROLE_SIDEBAR_LINKS: Record<UserRole, NavLink[]> = {
  underwriter: [
    { href: "/dashboard/underwriter", label: "Overview", icon: "📊" },
    { href: "/documents", label: "Policies", icon: "📄" },
    { href: "/chat", label: "Policy Chat", icon: "💬" },
    { href: "/analytics", label: "Analytics", icon: "📈" },
  ],
  claims_adjuster: [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/claims", label: "Claims Validation", icon: "✅" },
    { href: "/documents", label: "Policies", icon: "📄" },
    { href: "/chat", label: "Policy Chat", icon: "💬" },
  ],
  compliance_officer: [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/compliance", label: "Compliance", icon: "🛡️" },
    { href: "/dashboard/compliance", label: "Compliance Dashboard", icon: "📋" },
    { href: "/audit", label: "Audit Trail", icon: "📜" },
    { href: "/documents", label: "Policies", icon: "📄" },
    { href: "/chat", label: "Policy Chat", icon: "💬" },
  ],
  fraud_analyst: [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/fraud", label: "Fraud Alerts", icon: "🔍" },
    { href: "/claims", label: "Claims Review", icon: "✅" },
    { href: "/audit", label: "Audit Trail", icon: "📜" },
    { href: "/documents", label: "Policies", icon: "📄" },
    { href: "/chat", label: "Policy Chat", icon: "💬" },
  ],
  broker: [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/documents", label: "Policies", icon: "📄" },
    { href: "/chat", label: "Policy Chat", icon: "💬" },
  ],
  auditor: [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/audit", label: "Audit Trail", icon: "📜" },
    { href: "/compliance", label: "Compliance", icon: "🛡️" },
    { href: "/documents", label: "Policies", icon: "📄" },
    { href: "/analytics", label: "Analytics", icon: "📈" },
  ],
  customer: [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/chat", label: "Policy Chat", icon: "💬" },
    { href: "/documents", label: "My Policies", icon: "📄" },
  ],
  admin: [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/documents", label: "Policies", icon: "📄" },
    { href: "/chat", label: "Policy Chat", icon: "💬" },
    { href: "/claims", label: "Claims", icon: "✅" },
    { href: "/fraud", label: "Fraud", icon: "🔍" },
    { href: "/compliance", label: "Compliance", icon: "🛡️" },
    { href: "/audit", label: "Audit", icon: "📜" },
    { href: "/analytics", label: "Analytics", icon: "📈" },
  ],
};

/**
 * Role-to-route mapping.
 * Each role has an array of routes they can access.
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Admin can access everything
  admin: [
    "/dashboard",
    "/documents",
    "/chat",
    "/claims",
    "/fraud",
    "/compliance",
    "/analytics",
    "/audit",
    "/settings",
  ],

  // Underwriter: risk assessment, policies, AI chat, analytics
  underwriter: [
    "/dashboard",
    "/dashboard/underwriter",
    "/documents",
    "/chat",
    "/claims",
    "/analytics",
    "/settings",
  ],

  // Claims Adjuster: claims validation, policies, AI chat
  claims_adjuster: [
    "/dashboard",
    "/documents",
    "/chat",
    "/claims",
    "/settings",
  ],

  // Compliance Officer: compliance audit, policies, AI chat, analytics, audit trail
  compliance_officer: [
    "/dashboard",
    "/dashboard/compliance",
    "/documents",
    "/chat",
    "/compliance",
    "/analytics",
    "/audit",
    "/settings",
  ],

  // Fraud Analyst: fraud detection, claims, policies, AI chat, analytics, audit trail
  fraud_analyst: [
    "/dashboard",
    "/documents",
    "/chat",
    "/claims",
    "/fraud",
    "/analytics",
    "/audit",
    "/settings",
  ],

  // Broker: policies, AI chat (limited)
  broker: [
    "/dashboard",
    "/documents",
    "/chat",
    "/settings",
  ],

  // Auditor: compliance, policies (read-only focus), analytics, audit trail
  auditor: [
    "/dashboard",
    "/documents",
    "/chat",
    "/compliance",
    "/analytics",
    "/audit",
    "/settings",
  ],

  // Customer: basic policy viewing, AI chat
  customer: [
    "/dashboard",
    "/documents",
    "/chat",
    "/settings",
  ],
};

/**
 * All available navigation links.
 */
const ALL_NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Policies" },
  { href: "/chat", label: "AI Assistant" },
  { href: "/claims", label: "Claims" },
  { href: "/fraud", label: "Fraud" },
  { href: "/compliance", label: "Compliance" },
  { href: "/analytics", label: "Analytics" },
];

/**
 * Check if a user with the given role can access a route.
 */
export function canAccessRoute(role: string | null, route: string): boolean {
  if (!role) return false;

  const normalizedRole = role as UserRole;
  const allowedRoutes = ROLE_PERMISSIONS[normalizedRole];

  if (!allowedRoutes) return false;

  // Check if the route or any parent route is in the allowed list
  return allowedRoutes.some((allowed) => {
    if (route === allowed) return true;
    // Allow access to child routes (e.g., /dashboard/underwriter when /dashboard is allowed)
    if (route.startsWith(allowed + "/")) return true;
    return false;
  });
}

/**
 * Get navigation links visible to a specific role.
 */
export function getVisibleNavLinks(role: string | null): NavLink[] {
  if (!role) return [];

  const normalizedRole = role as UserRole;
  const allowedRoutes = ROLE_PERMISSIONS[normalizedRole];

  if (!allowedRoutes) return [];

  // Filter nav links to only those the role can access
  return ALL_NAV_LINKS.filter((link) =>
    allowedRoutes.some((route) => link.href === route || route.startsWith(link.href + "/"))
  );
}

/**
 * Get a user-friendly error message for unauthorized access.
 */
export function getUnauthorizedMessage(role: string | null): string {
  if (!role) return "You must be logged in to access this page.";

  const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return `Access denied. This page is not available for ${roleLabel} role.`;
}

/**
 * Get the default route for a specific role (used after login/onboarding).
 */
export function getRoleDefaultRoute(role: string | null): string {
  if (!role) return "/dashboard";
  const normalizedRole = role as UserRole;
  return ROLE_DEFAULT_ROUTES[normalizedRole] || "/dashboard";
}

/**
 * Get sidebar links for a specific role.
 */
export function getRoleSidebarLinks(role: string | null): NavLink[] {
  if (!role) return ROLE_SIDEBAR_LINKS.customer;
  const normalizedRole = role as UserRole;
  return ROLE_SIDEBAR_LINKS[normalizedRole] || ROLE_SIDEBAR_LINKS.customer;
}

/**
 * Get a user-friendly role label.
 */
export function getRoleLabel(role: string | null): string {
  if (!role) return "User";
  return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
