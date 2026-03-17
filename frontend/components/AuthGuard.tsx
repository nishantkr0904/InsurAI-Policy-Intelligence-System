"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isOnboarded } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard – wraps any client page that requires authentication.
 * Redirects unauthenticated users to /login.
 * Redirects authenticated-but-not-yet-onboarded users to /onboarding.
 * Renders a spinner while the auth state is being resolved.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else if (!isOnboarded()) {
      router.replace("/onboarding");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full animate-spin border-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
