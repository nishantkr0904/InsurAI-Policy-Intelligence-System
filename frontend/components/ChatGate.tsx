"use client";

import { useEffect, useState } from "react";
import ChatPageClient from "@/components/ChatPageClient";

/**
 * ChatGate – reads workspaceId from localStorage and passes it to ChatPageClient.
 */
export default function ChatGate() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const ws = localStorage.getItem("insurai_workspace") || "default";
    setWorkspaceId(ws);
  }, []);

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
