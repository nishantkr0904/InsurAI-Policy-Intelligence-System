import type { Metadata } from "next";
import AuditClient from "./AuditClient";

/**
 * Audit Trail page – FR021
 * Comprehensive historical record of policy modifications, claims decisions,
 * compliance checks, and user activity logs for regulatory compliance and
 * forensic investigation.
 */

export const metadata: Metadata = { title: "Audit Trail – InsurAI" };

export default function AuditPage() {
  return <AuditClient />;
}
