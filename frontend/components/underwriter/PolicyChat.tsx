"use client";

import { useState, useRef, useEffect } from "react";
import { streamChat, fetchChatResponse, fetchDocuments, type ChatResponse, type DocumentRecord, type SourceCitation, type EdgeCaseWarning } from "@/lib/api";
import WarningPanel from "./WarningPanel";
import { toast } from "sonner";

interface PolicyChatProps {
  workspaceId: string;
  isDemo: boolean;
}

// Mock demo response
const DEMO_RESPONSE: ChatResponse = {
  answer: "Based on the policy documents, flood damage coverage is included under Section 4.2.3 with a $1,000 deductible. However, coverage is limited to $50,000 per incident and excludes damage caused by negligence or lack of maintenance.",
  sources: [
    { document_id: "doc-001", chunk_index: 12, text_preview: "Flood damage is covered under this policy...", score: 0.92, filename: "HomeOwners_Policy_2024.pdf", page_number: 12 },
    { document_id: "doc-001", chunk_index: 15, text_preview: "Deductible for flood-related claims is $1,000...", score: 0.87, filename: "HomeOwners_Policy_2024.pdf", page_number: 14 },
  ],
  model: "claude-3-sonnet",
  token_usage: { total_tokens: 456 },
  retrieved_chunks: 5,
  confidence: 0.92,
  confidence_category: "high",
  warnings: [],
};

export default function PolicyChat({ workspaceId, isDemo }: PolicyChatProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; sources?: SourceCitation[]; confidence?: number; warnings?: EdgeCaseWarning[]; confidence_category?: string }>>([]);
  const [streaming, setStreaming] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [currentSources, setCurrentSources] = useState<SourceCitation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [workspaceId, isDemo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadDocuments() {
    try {
      if (isDemo) {
        setDocuments([
          { document_id: "doc-001", filename: "HomeOwners_Policy_2024.pdf", status: "indexed", workspace_id: "demo" },
          { document_id: "doc-002", filename: "Auto_Insurance_Standard.pdf", status: "indexed", workspace_id: "demo" },
        ]);
      } else {
        const docs = await fetchDocuments(workspaceId);
        setDocuments(docs.filter(d => d.status === "indexed"));
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || streaming) return;

    const userQuery = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setStreaming(true);

    try {
      if (isDemo) {
        // Simulate streaming for demo
        let demoAnswer = "";
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        for (const char of DEMO_RESPONSE.answer) {
          demoAnswer += char;
          await new Promise(r => setTimeout(r, 20));
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = demoAnswer;
            return updated;
          });
        }

        // Add sources and confidence
        const confidence = DEMO_RESPONSE.confidence || 0.89;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].sources = DEMO_RESPONSE.sources;
          updated[updated.length - 1].confidence = confidence;
          updated[updated.length - 1].confidence_category = DEMO_RESPONSE.confidence_category;
          updated[updated.length - 1].warnings = DEMO_RESPONSE.warnings || [];
          return updated;
        });
        setCurrentSources(DEMO_RESPONSE.sources);
      } else {
        // Real streaming
        let fullAnswer = "";
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        for await (const token of streamChat(userQuery, workspaceId, 5, selectedDocs.length > 0 ? selectedDocs : undefined)) {
          if (token === null) break;
          fullAnswer += token;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = fullAnswer;
            return updated;
          });
        }

        // Fetch full response with sources and warnings
        const response = await fetchChatResponse(userQuery, workspaceId, 5, selectedDocs.length > 0 ? selectedDocs : undefined);
        const confidence = response.confidence || calculateConfidence(response.sources);

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].sources = response.sources;
          updated[updated.length - 1].confidence = confidence;
          updated[updated.length - 1].confidence_category = response.confidence_category;
          updated[updated.length - 1].warnings = response.warnings || [];
          return updated;
        });
        setCurrentSources(response.sources);
      }
    } catch (error) {
      console.error("Chat failed:", error);
      toast.error("Failed to get response");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  function calculateConfidence(sources: SourceCitation[]): number {
    if (!sources || sources.length === 0) return 0;
    const avgScore = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
    return avgScore;
  }

  function getConfidenceLabel(confidence?: number): { label: string; color: string; bg: string } {
    if (!confidence) return { label: "Unknown", color: "var(--text-muted)", bg: "var(--bg-surface)" };
    if (confidence >= 0.8) return { label: "High", color: "var(--success)", bg: "var(--success-soft)" };
    if (confidence >= 0.6) return { label: "Medium", color: "var(--warning)", bg: "var(--warning-soft)" };
    return { label: "Low", color: "var(--danger)", bg: "var(--danger-soft)" };
  }

  function toggleDocFilter(docId: string) {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header with Document Filter */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Policy Chat
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Ask questions about your policy documents
          </p>
        </div>

        {/* Multi-document filter */}
        {documents.length > 0 && (
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
              Filter by documents ({selectedDocs.length > 0 ? selectedDocs.length : "all"})
            </p>
            <div className="flex flex-wrap gap-2">
              {documents.map(doc => (
                <button
                  key={doc.document_id}
                  onClick={() => toggleDocFilter(doc.document_id)}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: selectedDocs.includes(doc.document_id) ? "var(--accent-soft)" : "var(--bg-surface)",
                    color: selectedDocs.includes(doc.document_id) ? "var(--accent)" : "var(--text-secondary)",
                    border: selectedDocs.includes(doc.document_id) ? "1px solid var(--accent)" : "1px solid var(--border)",
                  }}
                >
                  {doc.filename}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div
        className="flex-1 overflow-y-auto space-y-4 mb-4 rounded-lg p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              Start a conversation
            </p>
            <p className="text-xs max-w-md" style={{ color: "var(--text-secondary)" }}>
              Ask questions about policy coverage, exclusions, deductibles, or any other policy details.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div
                    className="max-w-2xl rounded-lg px-4 py-3"
                    style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }}
                  >
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    className="max-w-3xl rounded-lg px-4 py-3"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                      {msg.content}
                      {streaming && i === messages.length - 1 && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                      )}
                    </p>

                    {/* Confidence Score */}
                    {msg.confidence !== undefined && (
                      <div className="mt-3 flex items-center gap-2">
                        {(() => {
                          const conf = getConfidenceLabel(msg.confidence);
                          return (
                            <span
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ background: conf.bg, color: conf.color }}
                            >
                              Confidence: {conf.label} ({Math.round(msg.confidence * 100)}%)
                            </span>
                          );
                        })()}

                                            {/* Low confidence warning */}
                        {msg.confidence < 0.6 && (
                          <span className="text-xs" style={{ color: "var(--warning)" }}>
                            ⚠️ Limited relevant context found
                          </span>
                        )}
                      </div>
                    )}

                    {/* Warnings Panel */}
                    {msg.warnings && msg.warnings.length > 0 && (
                      <div className="mt-3">
                        <WarningPanel warnings={msg.warnings} />
                      </div>
                    )}

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            setCurrentSources(msg.sources || []);
                            setShowSources(true);
                          }}
                          className="text-xs font-medium transition-colors"
                          style={{ color: "var(--accent)" }}
                        >
                          📎 View {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about policy coverage, exclusions, deductibles..."
          disabled={streaming}
          className="flex-1 input"
          autoFocus
        />
        <button
          type="submit"
          disabled={!query.trim() || streaming}
          className="btn-primary px-6 rounded-lg"
          style={{ opacity: !query.trim() || streaming ? 0.5 : 1 }}
        >
          {streaming ? "..." : "Send"}
        </button>
      </form>

      {/* Sources Modal */}
      {showSources && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
          onClick={() => setShowSources(false)}
        >
          <div
            className="max-w-3xl w-full max-h-[80vh] overflow-y-auto rounded-lg p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Source Citations
              </h3>
              <button
                onClick={() => setShowSources(false)}
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              {currentSources.map((source, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {source.filename || `Document ${source.document_id}`}
                      </p>
                      {source.page_number && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          Page {source.page_number} · Chunk {source.chunk_index}
                        </p>
                      )}
                    </div>
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        background: source.score >= 0.8 ? "var(--success-soft)" : "var(--warning-soft)",
                        color: source.score >= 0.8 ? "var(--success)" : "var(--warning)",
                      }}
                    >
                      {Math.round(source.score * 100)}%
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {source.text_preview}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
