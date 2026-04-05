"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hydrateSession } from "@/lib/auth";
import OnboardingFlow from "@/components/OnboardingFlow";

/**
 * Onboarding page at "/onboarding".
 * Requires authentication – redirects unauthenticated users to "/login".
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const user = await hydrateSession();
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.onboarded) {
        router.replace("/dashboard");
        return;
      }
      setReady(true);
    };

    void init();
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
