"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_QUESTIONS = [
  "What does clause 7 say about flood damage coverage?",
  "Is theft of electronics covered under this homeowner policy?",
  "What is the deductible for auto collision claims over $10,000?",
  "Validate this claim: vehicle storm damage on 12/15/2024",
  "Are there exclusions for pre-existing conditions in this health policy?",
  "Does my policy cover rental car reimbursement after an accident?",
  "What is the liability limit for bodily injury in this auto policy?",
];

/**
 * Interactive "Ask Anything" section with:
 *  - typewriter placeholder that cycles through example questions
 *  - clickable chips that populate the input
 *  - keyboard + screen-reader accessible
 */
export default function PolicyQuerySection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [value,   setValue]   = useState("");
  const [phrase,  setPhrase]  = useState("");     // animated placeholder text
  const [pIdx,    setPIdx]    = useState(0);      // which question we're on
  const [cIdx,    setCIdx]    = useState(0);      // char position
  const [erasing, setErasing] = useState(false);
  const [paused,  setPaused]  = useState(false);  // pause while user is typing

  /* ── Typewriter effect ────────────────────────────────────── */
  useEffect(() => {
    if (paused) return;

    const current = EXAMPLE_QUESTIONS[pIdx];

    let delay: number;
    if (!erasing && cIdx < current.length)        delay = 48;
    else if (!erasing && cIdx === current.length)  delay = 1800;
    else if (erasing && cIdx > 0)                  delay = 22;
    else                                            delay = 400;

    const id = setTimeout(() => {
      if (!erasing && cIdx < current.length) {
        setPhrase(current.slice(0, cIdx + 1));
        setCIdx((c) => c + 1);
      } else if (!erasing && cIdx === current.length) {
        setErasing(true);
      } else if (erasing && cIdx > 0) {
        setPhrase(current.slice(0, cIdx - 1));
        setCIdx((c) => c - 1);
      } else {
        setErasing(false);
        setPIdx((i) => (i + 1) % EXAMPLE_QUESTIONS.length);
      }
    }, delay);

    return () => clearTimeout(id);
  }, [cIdx, erasing, pIdx, paused]);

  function handleChipClick(q: string) {
    setValue(q);
    setPaused(true);
    inputRef.current?.focus();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    setPaused(e.target.value.length > 0);
    if (e.target.value.length === 0) {
      setPaused(false);
      setErasing(false);
      setCIdx(0);
      setPhrase("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/signup?q=${encodeURIComponent(value.trim())}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Allow chips to be activated via Enter or Space
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const chip = (e.target as HTMLElement).dataset.question;
      if (chip) handleChipClick(chip);
    }
  }

  return (
    <section
      aria-labelledby="ask-section-heading"
      style={{ padding: "80px 24px" }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>

        <h2
          id="ask-section-heading"
          style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}
        >
          Ask Anything About Your Policies
        </h2>
        <p style={{ marginTop: "10px", color: "var(--text-secondary)", marginBottom: "36px" }}>
          Natural language queries, precise policy answers
        </p>

        {/* ── Query input ───────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Policy query search"
          style={{ marginBottom: "28px" }}
        >
          <div style={{ position: "relative" }}>
            {/* Chat icon */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", left: "16px", top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none",
                color: "var(--accent)", display: "flex",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>

            <input
              ref={inputRef}
              data-testid="policy-query-input"
              type="search"
              value={value}
              onChange={handleInputChange}
              onFocus={() => value.length === 0 && setPaused(false)}
              onBlur={() => value.length === 0 && setPaused(false)}
              placeholder={phrase || "Ask about your policy…"}
              aria-label="Type a question about your insurance policy"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1.5px solid var(--border)",
                borderRadius: "12px",
                color: "var(--text-primary)",
                fontSize: "15px",
                padding: "15px 52px 15px 46px",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.target)
                  (e.target as HTMLInputElement).style.borderColor = "var(--border)";
              }}
              onFocusCapture={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "var(--accent)";
                (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
              }}
              onBlurCapture={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "var(--border)";
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
            />

            {/* Submit arrow */}
            <button
              type="submit"
              aria-label="Submit query"
              disabled={!value.trim()}
              style={{
                position: "absolute", right: "10px", top: "50%",
                transform: "translateY(-50%)",
                background: value.trim() ? "var(--accent-gradient)" : "var(--bg-card)",
                border: "none", borderRadius: "8px",
                width: "34px", height: "34px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: value.trim() ? "pointer" : "default",
                transition: "background-color 0.15s ease, color 0.15s ease",
                color: value.trim() ? "#fff" : "var(--text-muted)",
                willChange: "transform",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>

        {/* ── Chips ────────────────────────────────────── */}
        <div
          role="group"
          aria-label="Example questions – click to populate the query input"
          data-testid="landing-question-chips"
          style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}
          onKeyDown={handleKeyDown}
        >
          {EXAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={q}
              type="button"
              data-question={q}
              data-testid={`question-chip-${i}`}
              aria-label={`Use example: ${q}`}
              onClick={() => handleChipClick(q)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "8px 15px",
                background: value === q ? "var(--accent-soft)" : "var(--bg-card)",
                border: `1.5px solid ${value === q ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "9999px",
                color: value === q ? "var(--accent)" : "var(--text-secondary)",
                fontSize: "13px", fontWeight: 500,
                cursor: "pointer",
                transition: "border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (value !== q) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-soft)";
                }
              }}
              onMouseLeave={(e) => {
                if (value !== q) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card)";
                }
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLButtonElement).style.outline = "2px solid var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.outlineOffset = "2px";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLButtonElement).style.outline = "none";
              }}
            >
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              {q}
            </button>
          ))}
        </div>

        <p style={{ marginTop: "20px", fontSize: "12px", color: "var(--text-muted)" }}>
          Click any question to try it, or type your own. Sign up free to get answers.
        </p>
      </div>
    </section>
  );
}
