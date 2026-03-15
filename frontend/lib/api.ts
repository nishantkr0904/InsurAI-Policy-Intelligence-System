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
 */
export async function* streamChat(
  query: string,
  workspaceId: string,
  topK = 5,
): AsyncGenerator<string | null> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, workspace_id: workspaceId, top_k: topK }),
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
 */
export async function fetchChatResponse(
  query: string,
  workspaceId: string,
  topK = 5,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, workspace_id: workspaceId, top_k: topK }),
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
