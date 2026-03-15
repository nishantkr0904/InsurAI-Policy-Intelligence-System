"use client";

/**
 * ChatPanel – real-time streaming chat interface for policy Q&A.
 *
 * Streams tokens from POST /api/v1/chat/stream via the streamChat()
 * generator in lib/api.ts and renders them progressively.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "develop the Chat Interface handling SSE streams"
 *   docs/roadmap.md Phase 6 – "Frontend → Backend → AI Services via SSE"
 */

import { useRef, useState } from "react";
import { streamChat, fetchChatResponse, type SourceCitation } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

interface ChatPanelProps {
  workspaceId: string;
  /** Called after each completed response with the retrieved source citations. */
  onCitations?: (sources: SourceCitation[]) => void;
}

export default function ChatPanel({ workspaceId, onCitations }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function send() {
    const query = input.trim();
    if (!query || busy) return;

    setInput("");
    setBusy(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", text: query }]);

    // Add empty assistant placeholder
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", streaming: true },
    ]);

    try {
      const stream = streamChat(query, workspaceId);
      for await (const token of stream) {
        if (token === null) break;           // [DONE] signal
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last.role === "assistant") {
            next[next.length - 1] = { ...last, text: last.text + token };
          }
          return next;
        });
        scrollBottom();
      }

      // Fetch full response (with citations) from the blocking endpoint.
      // The SSE stream emits tokens only; sources require a second call.
      if (onCitations) {
        try {
          const full = await fetchChatResponse(query, workspaceId);
          onCitations(full.sources);
        } catch { /* citations are non-critical; silently ignore */ }
      }
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          text: `Error: ${(e as Error).message}`,
        };
        return next;
      });
    } finally {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });
      setBusy(false);
      scrollBottom();
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Message history ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.2" style={{ color: "var(--text-secondary)" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ask a question about your uploaded policies.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? "var(--accent)" : "var(--bg-card)",
                color: "var(--text-primary)",
                borderBottomRightRadius: m.role === "user" ? "4px" : undefined,
                borderBottomLeftRadius:  m.role === "assistant" ? "4px" : undefined,
              }}
            >
              {m.text}
              {m.streaming && (
                <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse"
                  style={{ background: "var(--accent)", borderRadius: "2px" }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div
        className="flex items-center gap-3 p-4 border-t"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <input
          className="input flex-1"
          placeholder="Ask about coverage, exclusions, claim procedures…"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          className="btn-primary"
          onClick={send}
          disabled={busy || !input.trim()}
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
