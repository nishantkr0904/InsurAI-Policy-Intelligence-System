"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWorkspaceId, hydrateSession } from "@/lib/auth";
import ChatPageClient from "@/components/ChatPageClient";

/**
 * ChatGate – validates auth/session and
 * and passes it to ChatPageClient.
 */
export default function ChatGate() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await hydrateSession();
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!user.onboarded) {
        router.replace("/onboarding");
        return;
      }
      const ws = getWorkspaceId() || "default";
      setWorkspaceId(ws);
    };

    void init();
  }, [router]);

  if (!workspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-spin"
          style={{ border: "2px solid var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return <ChatPageClient workspaceId={workspaceId} />;
}
