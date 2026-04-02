/**
 * Typed fetch wrappers for InsurAI backend endpoints.
 *
 * All paths are relative (/api/...) so they are transparently
 * proxied to FastAPI by next.config.ts rewrites – no CORS needed.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Frontend → Backend → AI Services"
 */

/** Shape of a single edge case warning in a chat response. */
export interface EdgeCaseWarning {
  warning_type: "low_confidence" | "conflicting_data" | "no_data" | "processing_failed";
  severity: "info" | "warning" | "error";
  message: string;
  affected_documents?: string[];
  recommended_action?: string;
}

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
  confidence: number;
  confidence_category: "high" | "medium" | "low";
  model: string;
  token_usage: { total_tokens: number };
  retrieved_chunks: number;
  warnings?: EdgeCaseWarning[];
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

/** Shape of claim validation request matching backend schema. */
export interface ClaimValidationRequest {
  claim_id: string;
  policy_number: string;
  claim_type: "health" | "auto" | "home" | "life" | "disability" | "property" | "liability" | "other";
  claim_amount: number;
  description: string;
  claim_date?: string;
  workspace_id: string;
  user_id?: string;
}

/** Shape of a referenced clause in claim validation. */
export interface ReferencedClause {
  document_id: string;
  chunk_index: number;
  clause_text: string;
  relevance_score: number;
  violation_detected: boolean;
}

/** Shape of claim validation response from backend. */
export interface ClaimValidationResponse {
  claim_id: string;
  policy_number: string;
  approval_status: "approved" | "denied" | "pending" | "needs_review";
  risk_score: number;
  severity: "low" | "medium" | "high" | "critical";
  reasoning: string;
  referenced_clauses: ReferencedClause[];
  confidence_score: number;
  next_steps: string[];
  processed_at: string;
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

/** Shape of a fraud alert from the backend. */
export interface FraudAlert {
  alert_id: string;
  claim_id: string;
  policy_number: string;
  risk_score: number;
  severity: "low" | "medium" | "high" | "critical";
  anomaly_types: string[];
  status: "new" | "under_review" | "escalated" | "resolved" | "false_positive";
  reasoning: string;
  claim_amount: number;
  submit_date: string;
  detected_date: string;
  related_claims: {
    claim_id: string;
    similarity_score: number;
    claim_amount: number;
    submit_date: string;
  }[];
  confidence_score: number;
}

/** Shape of fraud alerts response. */
export interface FraudAlertsResponse {
  alerts: FraudAlert[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Fetch fraud alerts for a workspace. */
export async function fetchFraudAlerts(
  workspaceId: string,
  options?: {
    status?: string;
    severity?: string;
    minRiskScore?: number;
    limit?: number;
    offset?: number;
  },
): Promise<FraudAlertsResponse> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
  });
  if (options?.status) params.append("status", options.status);
  if (options?.severity) params.append("severity", options.severity);
  if (options?.minRiskScore !== undefined)
    params.append("min_risk_score", String(options.minRiskScore));
  if (options?.limit) params.append("limit", String(options.limit));
  if (options?.offset) params.append("offset", String(options.offset));

  const res = await fetch(`${BASE}/fraud/alerts?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch fraud alerts: ${res.status}`);
  return res.json() as Promise<FraudAlertsResponse>;
}

/** Shape of a compliance issue from the backend. */
export interface ComplianceIssue {
  issue_id: string;
  rule_name: string;
  rule_category: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "in_progress" | "resolved" | "waived";
  policy_id?: string;
  document_section?: string;
  detected_date: string;
  due_date?: string;
  remediation_steps: string[];
  affected_records: number;
}

/** Shape of compliance issues response. */
export interface ComplianceIssuesResponse {
  issues: ComplianceIssue[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  summary: {
    total_count?: number;
    by_severity?: Record<string, number>;
    by_status?: Record<string, number>;
    by_category?: Record<string, number>;
  };
}

/** Fetch compliance issues for a workspace. */
export async function fetchComplianceIssues(
  workspaceId: string,
  options?: {
    statusFilter?: string;
    severityFilter?: string;
    categoryFilter?: string;
    limit?: number;
    offset?: number;
  },
): Promise<ComplianceIssuesResponse> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
  });
  if (options?.statusFilter) params.append("status_filter", options.statusFilter);
  if (options?.severityFilter) params.append("severity_filter", options.severityFilter);
  if (options?.categoryFilter) params.append("category_filter", options.categoryFilter);
  if (options?.limit) params.append("limit", String(options.limit));
  if (options?.offset) params.append("offset", String(options.offset));

  const res = await fetch(`${BASE}/compliance/issues?${params.toString()}`);
  if (!res.ok)
    throw new Error(`Failed to fetch compliance issues: ${res.status}`);
  return res.json() as Promise<ComplianceIssuesResponse>;
}

/** Shape of executive summary in compliance report. */
export interface ExecutiveSummary {
  compliance_score: number;
  total_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  remediation_rate: number;
  last_audit_date: string;
}

/** Shape of compliance report from the backend. */
export interface ComplianceReport {
  report_id: string;
  workspace_id: string;
  generated_date: string;
  executive_summary: ExecutiveSummary;
  category_breakdown: {
    category: string;
    issue_count: number;
    critical_count: number;
    high_count: number;
    average_days_open: number;
  }[];
  top_issues: ComplianceIssue[];
  recommendations: {
    priority: number;
    action: string;
    impact: string;
    timeline: string;
  }[];
  detailed_issues: ComplianceIssue[];
}

/** Fetch compliance report for a workspace. */
export async function fetchComplianceReport(
  workspaceId: string,
  options?: {
    includeResolved?: boolean;
  },
): Promise<ComplianceReport> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
  });
  if (options?.includeResolved) params.append("include_resolved", "true");

  const res = await fetch(`${BASE}/compliance/report?${params.toString()}`);
  if (!res.ok)
    throw new Error(`Failed to fetch compliance report: ${res.status}`);
  return res.json() as Promise<ComplianceReport>;
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

/** Shape of an audit log entry from the backend. */
export interface AuditLogEntry {
  audit_id: string;
  timestamp: string;
  workspace_id: string;
  user_id: string;
  user_email?: string;
  action: string;
  status: "success" | "failure" | "partial" | "error";
  severity: "info" | "warning" | "error" | "critical";
  resource_type?: string;
  resource_id?: string;
  description: string;
  metadata: {
    document_id?: string;
    claim_id?: string;
    alert_id?: string;
    query_text?: string;
    ip_address?: string;
    user_agent?: string;
    duration_ms?: number;
    error_message?: string;
    additional_context?: Record<string, unknown>;
  };
}

/** Shape of audit logs response. */
export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  summary: Record<string, unknown>;
}

/** Fetch audit logs for a workspace. */
export async function fetchAuditLogs(
  workspaceId: string,
  options?: {
    userId?: string;
    action?: string;
    status?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  },
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
  });
  if (options?.userId) params.append("user_id_filter", options.userId);
  if (options?.action) params.append("action_filter", options.action);
  if (options?.status) params.append("status_filter", options.status);
  if (options?.severity) params.append("severity_filter", options.severity);
  if (options?.startDate) params.append("start_date", options.startDate);
  if (options?.endDate) params.append("end_date", options.endDate);
  if (options?.limit) params.append("limit", String(options.limit));
  if (options?.offset) params.append("offset", String(options.offset));

  const res = await fetch(`${BASE}/audit?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.status}`);
  return res.json() as Promise<AuditLogsResponse>;
}

/** Shape of audit analytics from the backend. */
export interface AuditAnalytics {
  workspace_id: string;
  total_events: number;
  success_rate: number;
  top_actions: {
    action: string;
    count: number;
    success_rate: number;
    avg_duration_ms?: number;
  }[];
  most_active_users: {
    user_id: string;
    user_email?: string;
    action_count: number;
    last_activity: string;
  }[];
  error_count: number;
  critical_count: number;
  avg_response_time_ms?: number;
  period_start: string;
  period_end: string;
}

/** Fetch audit analytics for a workspace. */
export async function fetchAuditAnalytics(
  workspaceId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    topN?: number;
  },
): Promise<AuditAnalytics> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
  });
  if (options?.startDate) params.append("start_date", options.startDate);
  if (options?.endDate) params.append("end_date", options.endDate);
  if (options?.topN) params.append("top_n", String(options.topN));

  const res = await fetch(`${BASE}/audit/analytics?${params.toString()}`);
  if (!res.ok)
    throw new Error(`Failed to fetch audit analytics: ${res.status}`);
  return res.json() as Promise<AuditAnalytics>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance Metrics API (FR030)
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of performance statistics from /api/v1/metrics/stats */
export interface PerformanceStats {
  total_requests: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  by_operation: Record<string, { count: number; avg_ms: number }>;
  by_endpoint: Record<string, { count: number; avg_ms: number }>;
  by_source: Record<string, number>;
  avg_tokens_used?: number;
  avg_result_count?: number;
  quality_score_avg?: number;
}

/** Shape of performance health check from /api/v1/metrics/health */
export interface PerformanceHealthCheck {
  status: "healthy" | "degraded" | "critical";
  avg_api_latency_ms: number;
  p95_api_latency_ms: number;
  slow_endpoints: Array<{ endpoint: string; avg_ms: number; count: number }>;
  slow_operations: Array<{ operation: string; avg_ms: number; count: number }>;
  recommendations: string[];
}

/** Fetch performance statistics for a workspace. */
export async function fetchPerformanceStats(
  workspaceId?: string,
): Promise<PerformanceStats> {
  const params = new URLSearchParams();
  if (workspaceId) params.append("workspace_id", workspaceId);

  const res = await fetch(`${BASE}/metrics/stats?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch performance stats: ${res.status}`);
  return res.json() as Promise<PerformanceStats>;
}

/** Fetch performance health check. */
export async function fetchPerformanceHealth(
  workspaceId?: string,
): Promise<PerformanceHealthCheck> {
  const params = new URLSearchParams();
  if (workspaceId) params.append("workspace_id", workspaceId);

  const res = await fetch(`${BASE}/metrics/health?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch performance health: ${res.status}`);
  return res.json() as Promise<PerformanceHealthCheck>;
}

/** Risk distribution data from /api/v1/metrics/risk-distribution */
export interface RiskDistributionItem {
  level: "Low" | "Medium" | "High" | "Critical";
  count: number;
  percentage: number;
}

export interface RiskDistribution {
  total_assessments: number;
  distribution: RiskDistributionItem[];
  by_operation: Record<string, number>;
}

/** Document processing statistics from /api/v1/metrics/documents */
export interface DocumentProcessingStats {
  indexed_today: number;
  total_indexed: number;
  processing: number;
  failed: number;
  average_processing_time_ms: number;
}

/** Query analytics from /api/v1/metrics/queries */
export interface QueryAnalytic {
  query_text: string;
  count: number;
  percentage: number;
}

export interface QueryAnalytics {
  total_queries: number;
  most_common: QueryAnalytic[];
  by_hour: Record<string, number>;
}

/** Fetch risk assessment distribution. */
export async function fetchRiskDistribution(
  workspaceId?: string,
): Promise<RiskDistribution> {
  const params = new URLSearchParams();
  if (workspaceId) params.append("workspace_id", workspaceId);

  const res = await fetch(`${BASE}/metrics/risk-distribution?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch risk distribution: ${res.status}`);
  return res.json() as Promise<RiskDistribution>;
}

/** Fetch document processing statistics. */
export async function fetchDocumentProcessingStats(
  workspaceId?: string,
): Promise<DocumentProcessingStats> {
  const params = new URLSearchParams();
  if (workspaceId) params.append("workspace_id", workspaceId);

  const res = await fetch(`${BASE}/metrics/documents?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch document stats: ${res.status}`);
  return res.json() as Promise<DocumentProcessingStats>;
}

/** Fetch query analytics. */
export async function fetchQueryAnalytics(
  workspaceId?: string,
  topN: number = 5,
): Promise<QueryAnalytics> {
  const params = new URLSearchParams();
  if (workspaceId) params.append("workspace_id", workspaceId);
  params.append("top_n", String(topN));

  const res = await fetch(`${BASE}/metrics/queries?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch query analytics: ${res.status}`);
  return res.json() as Promise<QueryAnalytics>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation API
// ─────────────────────────────────────────────────────────────────────────────

export type ReportType = "summary" | "detailed";
export type ExportFormat = "pdf" | "json" | "csv";

export interface ReportExportRequest {
  policy_id: string;
  report_type: ReportType;
  export_format: ExportFormat;
  workspace_id: string;
  include_analytics?: boolean;
}

export interface ReportExportResponse {
  report_id: string;
  status: "success" | "processing" | "failed";
  download_url?: string;
  file_name: string;
  file_size_bytes: number;
  content_type: string;
  expires_at?: string;
  message?: string;
}

/** Export a risk assessment report in specified format. */
export async function exportReport(
  request: ReportExportRequest,
): Promise<ReportExportResponse> {
  const res = await fetch(`${BASE}/reports/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Failed to export report: ${res.status}`);
  }

  return res.json() as Promise<ReportExportResponse>;
}

// ---------------------------------------------------------------------------
// Authentication API
// ---------------------------------------------------------------------------

/** User response from backend */
export interface UserResponse {
  name: string;
  email: string;
  role: string | null;
  workspace: string | null;
  initials: string;
  onboarded: boolean;
}

/** Login request */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Login response */
export interface LoginResponse {
  success: boolean;
  user: UserResponse | null;
  error: string | null;
}

/** Registration request */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/** Registration response */
export interface RegisterResponse {
  success: boolean;
  error: string | null;
}

/** Onboarding update request */
export interface OnboardingUpdateRequest {
  workspace?: string;
  role?: string;
}

/**
 * Authenticate user with email and password.
 * POST /api/v1/auth/login
 */
export async function loginUser(
  request: LoginRequest
): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  return res.json() as Promise<LoginResponse>;
}

/**
 * Register a new user account.
 * POST /api/v1/auth/register
 */
export async function registerUser(
  request: RegisterRequest
): Promise<RegisterResponse> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status}`);
  }

  return res.json() as Promise<RegisterResponse>;
}

/**
 * Complete user onboarding (mark as onboarded, update workspace and role).
 * POST /api/v1/auth/onboarding/{email}
 */
export async function completeUserOnboarding(
  email: string,
  request: OnboardingUpdateRequest
): Promise<UserResponse> {
  const res = await fetch(`${BASE}/auth/onboarding/${encodeURIComponent(email)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Onboarding update failed: ${res.status}`);
  }

  return res.json() as Promise<UserResponse>;
}

