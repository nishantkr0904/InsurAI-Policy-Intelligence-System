"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isOnboarded } from "@/lib/auth";
import OnboardingFlow from "@/components/OnboardingFlow";

/**
 * OnboardingGate – client component rendered at `/` for authenticated users.
 * If user is authenticated but not onboarded → show OnboardingFlow.
 * If authenticated and onboarded → redirect to /dashboard.
 * If not authenticated → redirect to landing (handled by LandingOrOnboarding).
 */
export default function OnboardingGate() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      // Not auth – LandingOrOnboarding handles this case
      setChecked(true);
      return;
    }
    if (isOnboarded()) {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-t-transparent"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return <OnboardingFlow />;
}
