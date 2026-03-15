/**
 * Chat Page – /chat
 *
 * Dual-pane layout delegated to ChatPageClient (client component):
 *   Left  (flex-1):  ChatPanel  – real-time SSE streaming chat
 *   Right (w-80):    SourcePanel – cited chunks + UploadPanel
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "dual-pane view: Chat reasoning on the left,
 *   PDF Source Viewer (highlighting retrieved chunks) on the right."
 */

import ChatPageClient from "@/components/ChatPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat – InsurAI",
  description:
    "Ask questions about your insurance policies and get AI-powered, cited answers.",
};

/* Default workspace – replaced by JWT claim once Keycloak (P2) is wired in. */
const DEFAULT_WORKSPACE = "default";

export default function ChatPage() {
  return <ChatPageClient workspaceId={DEFAULT_WORKSPACE} />;
}
