import ChatGate from "@/components/ChatGate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat – InsurAI",
  description:
    "Ask questions about your insurance policies and get AI-powered, cited answers.",
};

export default function ChatPage() {
  return <ChatGate />;
}
