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
  /** Optional array of document IDs to filter queries. FR011 – Multi-Document Query. */
  documentIds?: string[];
}

export default function ChatPanel({ workspaceId, onCitations, documentIds }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const SUGGESTION_CHIPS = [
    "What does my policy cover?",
    "Are there flood exclusions?",
    "Summarize the liability limits",
  ];

  async function sendQuery(query: string) {
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
      // Pass documentIds to filter the search scope (FR011)
      const stream = streamChat(query, workspaceId, 5, documentIds);
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
          const full = await fetchChatResponse(query, workspaceId, 5, documentIds);
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

  function send() {
    sendQuery(input.trim());
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Message history ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--accent-soft)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--accent)" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Ask about your policies
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Get instant, citation-backed answers from your uploaded documents.
                </p>
              </div>
            </div>
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center px-4" data-testid="suggestion-chips">
              {SUGGESTION_CHIPS.map((chip) => (
                <button key={chip} className="chip" onClick={() => sendQuery(chip)}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: m.role === "user"
                  ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                  : "var(--bg-card)",
                color: "var(--text-primary)",
                borderBottomRightRadius: m.role === "user" ? "4px" : undefined,
                borderBottomLeftRadius:  m.role === "assistant" ? "4px" : undefined,
                boxShadow: m.role === "user"
                  ? "0 4px 12px rgba(37,99,235,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.3)",
                border: m.role === "assistant" ? "1px solid var(--border)" : undefined,
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
        className="flex items-center gap-3 px-4 py-3 border-t shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <input
          className="input flex-1"
          style={{ paddingTop: "0.65rem", paddingBottom: "0.65rem" }}
          placeholder="Ask about coverage, exclusions, claim procedures…"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          className="btn-primary"
          style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.6rem", paddingBottom: "0.6rem" }}
          onClick={send}
          disabled={busy || !input.trim()}
        >
          {busy ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Thinking
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              Send
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
