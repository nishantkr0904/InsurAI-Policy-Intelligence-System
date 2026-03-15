"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isOnboarded } from "@/lib/auth";
import OnboardingFlow from "@/components/OnboardingFlow";

/**
 * Onboarding page at "/onboarding".
 * Requires authentication – redirects unauthenticated users to "/login".
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else if (isOnboarded()) {
      router.replace("/dashboard");
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

  return <OnboardingFlow />;
}
