"use client";
import { useState, useRef, useEffect } from "react";
import { streamChat } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    document: string;
    page: number;
    relevance: number;
    snippet: string;
  }>;
}

interface ClaimChatProps {
  policyNumber: string;
  claimId: string;
  initialContext?: string;
  isDemo?: boolean;
}

const SUGGESTION_QUERIES = [
  "What are the coverage limits for this policy?",
  "What exclusions apply to this claim type?",
  "What is the deductible amount?",
  "What documentation is required?",
];

export default function ClaimChat({
  policyNumber,
  claimId,
  initialContext,
  isDemo = false,
}: ClaimChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(query?: string) {
    const text = query || input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Add placeholder for assistant
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    if (isDemo) {
      // Demo mode: simulate response
      const demoResponse = getDemoResponse(text, policyNumber);
      let fullContent = "";

      for (const char of demoResponse.content) {
        fullContent += char;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, sources: demoResponse.sources }
              : m
          )
        );
        await new Promise((r) => setTimeout(r, 15));
      }
      setIsStreaming(false);
      return;
    }

    // Real API call
    try {
      const contextQuery = initialContext
        ? `Context: Policy ${policyNumber}, Claim ${claimId}. ${initialContext}\n\nQuestion: ${text}`
        : `Regarding policy ${policyNumber} and claim ${claimId}: ${text}`;

      const stream = streamChat(contextQuery, getWorkspaceId() || "default");
      let fullContent = "";

      for await (const chunk of stream) {
        fullContent += chunk.content;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, sources: chunk.sources }
              : m
          )
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Error fetching response. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Policy Query Assistant
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Ask questions about {policyNumber} for claim {claimId}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
              Ask follow-up questions about the policy to help with your decision.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTION_QUERIES.map((query) => (
                <button
                  key={query}
                  onClick={() => handleSend(query)}
                  className="p-3 rounded-lg text-left text-sm transition-colors hover:border-[var(--accent)]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] rounded-lg p-3"
                style={{
                  background:
                    message.role === "user" ? "var(--accent)" : "var(--bg-surface)",
                  color: message.role === "user" ? "white" : "var(--text-primary)",
                  border:
                    message.role === "assistant"
                      ? "1px solid var(--border)"
                      : undefined,
                }}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Sources:
                    </p>
                    <div className="space-y-1">
                      {message.sources.slice(0, 3).map((source, i) => (
                        <div
                          key={i}
                          className="text-xs p-2 rounded"
                          style={{ background: "var(--bg-elevated)" }}
                        >
                          <span style={{ color: "var(--accent)" }}>
                            {source.document} p.{source.page}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}>
                            {" "}
                            ({(source.relevance * 100).toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isStreaming && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the policy..."
            disabled={isStreaming}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="btn-primary px-4"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Demo response generator
function getDemoResponse(query: string, policyNumber: string): { content: string; sources: Message["sources"] } {
  const queryLower = query.toLowerCase();

  if (queryLower.includes("limit") || queryLower.includes("coverage")) {
    return {
      content: `Based on policy ${policyNumber}, the coverage limits are as follows:\n\n- **Bodily Injury**: $100,000 per person / $300,000 per accident\n- **Property Damage**: $50,000 per accident\n- **Collision Deductible**: $500\n- **Comprehensive Deductible**: $250\n\nThese limits apply to covered incidents as defined in Section 4.2.`,
      sources: [
        { document: policyNumber, page: 5, relevance: 0.95, snippet: "Coverage limits per Section 4.2..." },
        { document: policyNumber, page: 12, relevance: 0.88, snippet: "Deductible requirements..." },
      ],
    };
  }

  if (queryLower.includes("exclusion")) {
    return {
      content: `Policy ${policyNumber} excludes the following:\n\n1. **Intentional damage** - Any damage caused intentionally by the insured\n2. **Racing activities** - Damage during competitive racing events\n3. **Commercial use** - Vehicle used for commercial purposes without endorsement\n4. **War and terrorism** - Losses due to war or terrorist activities\n\nSee Section 6.1 for complete exclusion details.`,
      sources: [
        { document: policyNumber, page: 18, relevance: 0.92, snippet: "Exclusions apply to..." },
      ],
    };
  }

  if (queryLower.includes("deductible")) {
    return {
      content: `The deductibles for policy ${policyNumber} are:\n\n- **Collision**: $500 deductible applies\n- **Comprehensive**: $250 deductible applies\n- **Uninsured Motorist**: No deductible\n\nDeductibles are subtracted from the claim payout before payment.`,
      sources: [
        { document: policyNumber, page: 8, relevance: 0.94, snippet: "Deductible amounts..." },
      ],
    };
  }

  if (queryLower.includes("document") || queryLower.includes("required")) {
    return {
      content: `For claim processing under policy ${policyNumber}, the following documentation is typically required:\n\n1. **Police report** (if applicable)\n2. **Photos of damage**\n3. **Repair estimates** from certified shops\n4. **Medical records** (for injury claims)\n5. **Proof of ownership**\n\nSubmit documents within 30 days of the incident per Section 8.3.`,
      sources: [
        { document: policyNumber, page: 22, relevance: 0.91, snippet: "Documentation requirements..." },
      ],
    };
  }

  // Default response
  return {
    content: `Based on my review of policy ${policyNumber}, I can help answer questions about coverage, exclusions, deductibles, and claim requirements. Please ask a more specific question about what you'd like to know.`,
    sources: [
      { document: policyNumber, page: 1, relevance: 0.75, snippet: "Policy overview..." },
    ],
  };
}
