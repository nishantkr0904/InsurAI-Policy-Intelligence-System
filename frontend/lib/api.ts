/**
 * Typed fetch wrappers for InsurAI backend endpoints.
 *
 * All paths are relative (/api/...) so they are transparently
 * proxied to FastAPI by next.config.ts rewrites – no CORS needed.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Frontend → Backend → AI Services"
 */

/** Shape of a single source citation in a chat response. */
export interface SourceCitation {
  document_id: string;
  chunk_index: number;
  text_preview: string;
  score: number;
  /** Human-readable filename when the backend provides it. */
  filename?: string;
  /** 1-based page number when the backend provides it. */
  page_number?: number;
}

/** Shape of POST /api/v1/chat response. */
export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  model: string;
  token_usage: { total_tokens: number };
  retrieved_chunks: number;
}

/** Shape of POST /api/v1/documents/upload response. */
export interface UploadResponse {
  document_id: string;
  status: string;
  message: string;
}

const BASE = "/api/v1";

/**
 * Open a streaming connection to /api/v1/chat/stream using the Fetch API.
 * Returns an async generator that yields decoded token strings.
 * Emits null when the stream is complete.
 *
 * @param documentIds - Optional array of document IDs to filter the search.
 *                      If provided, only these documents will be queried.
 *                      Implements FR011 – Multi-Document Query.
 */
export async function* streamChat(
  query: string,
  workspaceId: string,
  topK = 5,
  documentIds?: string[],
): AsyncGenerator<string | null> {
  const body: Record<string, unknown> = {
    query,
    workspace_id: workspaceId,
    top_k: topK,
  };
  if (documentIds && documentIds.length > 0) {
    body.document_ids = documentIds;
  }

  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stream request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        yield null;
        return;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed.token) yield parsed.token as string;
        if (parsed.error) throw new Error(parsed.error);
      } catch {
        /* skip malformed lines */
      }
    }
  }
}

/**
 * Blocking chat call – returns the full ChatResponse including source citations.
 * Called after SSE streaming completes to surface cited chunks in SourcePanel.
 *
 * @param documentIds - Optional array of document IDs to filter the search.
 *                      If provided, only these documents will be queried.
 *                      Implements FR011 – Multi-Document Query.
 */
export async function fetchChatResponse(
  query: string,
  workspaceId: string,
  topK = 5,
  documentIds?: string[],
): Promise<ChatResponse> {
  const body: Record<string, unknown> = {
    query,
    workspace_id: workspaceId,
    top_k: topK,
  };
  if (documentIds && documentIds.length > 0) {
    body.document_ids = documentIds;
  }

  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
  return res.json() as Promise<ChatResponse>;
}

/** Shape of a single document record returned by GET /api/v1/documents. */
export interface DocumentRecord {
  document_id: string;
  filename: string;
  status: "uploading" | "processing" | "indexed" | "error";
  workspace_id: string;
  created_at?: string;
  error_message?: string;
}

/** Fetch the list of documents for a given workspace. */
export async function fetchDocuments(
  workspaceId: string,
): Promise<DocumentRecord[]> {
  const res = await fetch(
    `${BASE}/documents?workspace_id=${encodeURIComponent(workspaceId)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch documents: ${res.status}`);
  return res.json() as Promise<DocumentRecord[]>;
}

/** Upload a single PDF/DOCX file for ingestion. */
export async function uploadDocument(
  file: File,
  workspaceId: string,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("workspace_id", workspaceId);

  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<UploadResponse>;
}

/**
 * Upload a single PDF/DOCX file with real XHR upload-progress callbacks.
 * @param onProgress - called with 0-100 integer as bytes transfer progresses.
 */
export function uploadDocumentWithProgress(
  file: File,
  workspaceId: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    form.append("workspace_id", workspaceId);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during upload")),
    );

    xhr.open("POST", `${BASE}/documents/upload`);
    xhr.send(form);
  });
}

/** Shape of claim validation request. */
export interface ClaimValidationRequest {
  claim_id: string;
  policy_number: string;
  claim_type: string;
  incident_date: string;
  amount: number;
  description: string;
  workspace_id: string;
}

/** Shape of claim validation response. */
export interface ClaimValidationResponse {
  status: "approved" | "denied" | "pending";
  reasoning: string;
  clauses: { ref: string; text: string }[];
  risk_score: number;
}

/** Validate a claim against policy rules. */
export async function validateClaim(
  request: ClaimValidationRequest,
): Promise<ClaimValidationResponse> {
  const res = await fetch(`${BASE}/claims/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Claim validation failed: ${res.status}`);
  return res.json() as Promise<ClaimValidationResponse>;
}

/** Shape of a fraud alert. */
export interface FraudAlert {
  id: string;
  claim_id: string;
  policy_id: string;
  type: string;
  risk_score: number;
  severity: "high" | "medium" | "low";
  date: string;
  description: string;
  status: "under_review" | "resolved" | "dismissed";
}

/** Fetch fraud alerts for a workspace. */
export async function fetchFraudAlerts(
  workspaceId: string,
): Promise<FraudAlert[]> {
  const res = await fetch(
    `${BASE}/fraud/alerts?workspace_id=${encodeURIComponent(workspaceId)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch fraud alerts: ${res.status}`);
  return res.json() as Promise<FraudAlert[]>;
}

/** Shape of a compliance issue. */
export interface ComplianceIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  rule: string;
  description: string;
  status: "open" | "acknowledged" | "resolved";
}

/** Fetch compliance issues for a workspace. */
export async function fetchComplianceIssues(
  workspaceId: string,
): Promise<ComplianceIssue[]> {
  const res = await fetch(
    `${BASE}/compliance/issues?workspace_id=${encodeURIComponent(workspaceId)}`,
  );
  if (!res.ok)
    throw new Error(`Failed to fetch compliance issues: ${res.status}`);
  return res.json() as Promise<ComplianceIssue[]>;
}

/** Shape of a single query log entry. */
export interface QueryLogEntry {
  query_id: string;
  query: string;
  user_id: string;
  workspace_id: string;
  timestamp: string;
  response_time_ms: number;
  model: string;
  token_usage: number;
  documents_searched: number;
  relevant_chunks: number;
  status: "success" | "error" | "timeout";
}

/** Fetch query logs for a workspace. */
export async function fetchQueryLogs(
  workspaceId: string,
  limit = 100,
): Promise<QueryLogEntry[]> {
  const res = await fetch(
    `${BASE}/analytics/queries?workspace_id=${encodeURIComponent(workspaceId)}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch query logs: ${res.status}`);
  return res.json() as Promise<QueryLogEntry[]>;
}

/** Shape of query analytics summary. */
export interface QueryAnalyticsSummary {
  total_queries: number;
  avg_response_time_ms: number;
  success_rate: number;
  total_tokens: number;
  avg_accuracy: number;
  total_users: number;
}

/** Fetch query analytics summary for a workspace. */
export async function fetchQueryAnalyticsSummary(
  workspaceId: string,
): Promise<QueryAnalyticsSummary> {
  const res = await fetch(
    `${BASE}/analytics/queries/summary?workspace_id=${encodeURIComponent(workspaceId)}`,
  );
  if (!res.ok)
    throw new Error(`Failed to fetch query analytics summary: ${res.status}`);
  return res.json() as Promise<QueryAnalyticsSummary>;
}

/** Shape of a risk assessment request. */
export interface RiskAssessmentRequest {
  policy_id: string;
  policy_type: string;
  coverage_amount: number;
  deductible: number;
  insured_value: number;
  location_risk_tier: "low" | "medium" | "high";
  claim_history: number; // number of claims in past 5 years
  workspace_id: string;
}

/** Shape of a risk assessment response. */
export interface RiskAssessmentResponse {
  risk_score: number; // 0-100
  risk_level: "low" | "medium" | "high" | "critical";
  underwriting_recommendation: string;
  key_risk_factors: string[];
  mitigation_strategies: string[];
  premium_adjustment: number; // percentage
  next_review_date: string;
}

/** Perform risk assessment on a policy. */
export async function performRiskAssessment(
  request: RiskAssessmentRequest,
): Promise<RiskAssessmentResponse> {
  const res = await fetch(`${BASE}/underwriting/risk-assessment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok)
    throw new Error(`Risk assessment request failed: ${res.status}`);
  return res.json() as Promise<RiskAssessmentResponse>;
}

/** Shape of an audit log entry. */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action_type: "policy_upload" | "policy_update" | "claim_decision" | "risk_assessment" | "compliance_check" | "fraud_alert" | "login" | "logout" | "settings_change";
  resource_type: "policy" | "claim" | "compliance" | "fraud" | "user" | "workspace";
  resource_id: string;
  resource_name: string;
  description: string;
  status: "success" | "failure";
  ip_address?: string;
  changes?: Record<string, { old: string; new: string }>;
}

/** Fetch audit logs for a workspace. */
export async function fetchAuditLogs(
  workspaceId: string,
  limit = 100,
): Promise<AuditLogEntry[]> {
  const res = await fetch(
    `${BASE}/audit/logs?workspace_id=${encodeURIComponent(workspaceId)}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.status}`);
  return res.json() as Promise<AuditLogEntry[]>;
}

/** Shape of audit summary statistics. */
export interface AuditSummary {
  total_actions: number;
  total_users: number;
  success_rate: number;
  critical_actions: number;
  date_range: { start: string; end: string };
}

/** Fetch audit summary for a workspace. */
export async function fetchAuditSummary(
  workspaceId: string,
): Promise<AuditSummary> {
  const res = await fetch(
    `${BASE}/audit/summary?workspace_id=${encodeURIComponent(workspaceId)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch audit summary: ${res.status}`);
  return res.json() as Promise<AuditSummary>;
}
