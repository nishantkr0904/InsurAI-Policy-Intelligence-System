"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser } from "@/lib/auth";
import { canAccessRoute, getUnauthorizedMessage } from "@/lib/rbac";

/**
 * RoleGuard - protects routes based on user role permissions.
 * Redirects unauthorized users to /dashboard with an error message.
 */
export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const user = getUser();
    const userRole = user?.role || null;

    // Check if user has permission to access this route
    const hasAccess = canAccessRoute(userRole, pathname);

    if (!hasAccess) {
      setAuthorized(false);
      setErrorMessage(getUnauthorizedMessage(userRole));
      // Redirect to dashboard after a brief moment
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      return () => clearTimeout(timer);
    }

    setAuthorized(true);
  }, [pathname, router]);

  // Still checking permissions
  if (authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  // Access denied
  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
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
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
}
