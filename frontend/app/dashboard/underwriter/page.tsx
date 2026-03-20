import type { Metadata } from "next";
import UnderwriterClient from "./UnderwriterClient";

/**
 * Underwriter dashboard – risk assessment and coverage query tools.
 *
 * Architecture ref:
 *   docs/system-architecture.md §4 – "Underwriters see risk-assessment tools"
 *   docs/roadmap.md Phase 7 – "/underwriter role-based route"
 *
 * FR015: Dedicated underwriter risk assessment tool with structured inputs
 * and AI-generated risk reports.
 */

export const metadata: Metadata = { title: "Underwriter Dashboard – InsurAI" };

export default function UnderwriterPage() {
  return <UnderwriterClient />;
}

