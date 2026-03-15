"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isOnboarded } from "@/lib/auth";
import OnboardingFlow from "@/components/OnboardingFlow";
import LandingPage from "@/components/LandingPage";

/**
 * LandingOrOnboarding – decides what to show at `/`:
 *  - Authenticated + not onboarded → OnboardingFlow (workspace setup wizard)
 *  - Authenticated + onboarded → redirect to /dashboard
 *  - Not authenticated → LandingPage (public marketing page)
 */
export default function LandingOrOnboarding() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "landing" | "onboarding">("loading");

  useEffect(() => {
    if (isAuthenticated()) {
      if (isOnboarded()) {
        router.replace("/dashboard");
      } else {
        setState("onboarding");
      }
    } else {
      setState("landing");
    }
  }, [router]);

  if (state === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full animate-spin border-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (state === "onboarding") return <OnboardingFlow />;
  return <LandingPage />;
}
