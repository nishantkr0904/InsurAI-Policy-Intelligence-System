"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingFlow from "@/components/OnboardingFlow";

/**
 * OnboardingGate – client component rendered at `/`.
 * Checks localStorage for `insurai_onboarded`; if set, redirects to /chat.
 * Otherwise renders the multi-step onboarding flow.
 */
export default function OnboardingGate() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("insurai_onboarded") === "true") {
      router.replace("/chat");
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
