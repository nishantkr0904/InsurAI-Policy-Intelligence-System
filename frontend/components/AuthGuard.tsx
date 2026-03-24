"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, isOnboarded, getUser } from "@/lib/auth";
import { canAccessRoute, getUnauthorizedMessage, getRoleDefaultRoute } from "@/lib/rbac";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If true, skip role-based access check (only check authentication) */
  skipRoleCheck?: boolean;
}

/**
 * AuthGuard – wraps any client page that requires authentication.
 * - Redirects unauthenticated users to /login.
 * - Redirects authenticated-but-not-yet-onboarded users to /onboarding.
 * - Checks role-based access permissions and redirects unauthorized users.
 * - Renders a spinner while the auth state is being resolved.
 */
export default function AuthGuard({ children, skipRoleCheck = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!isOnboarded()) {
      router.replace("/onboarding");
      return;
    }

    // Check role-based access (unless explicitly skipped)
    if (!skipRoleCheck) {
      const user = getUser();
      const userRole = user?.role || null;

      if (!canAccessRoute(userRole, pathname)) {
        setAccessDenied(true);
        setErrorMessage(getUnauthorizedMessage(userRole));

        // Redirect to role-appropriate dashboard after delay
        const timer = setTimeout(() => {
          router.push(getRoleDefaultRoute(userRole));
        }, 2500);
        return () => clearTimeout(timer);
      }
    }

    setReady(true);
  }, [router, pathname, skipRoleCheck]);

  // Still checking auth/permissions
  if (!ready && !accessDenied) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full animate-spin border-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // Access denied - show message and redirect
  if (accessDenied) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div
            className="rounded-xl px-6 py-8 text-center space-y-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.12)" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            </div>

            {/* Message */}
            <div>
              <h2
                className="text-lg font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Access Denied
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {errorMessage}
              </p>
            </div>

            {/* Redirect notice */}
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
