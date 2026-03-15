PROJECT MEMORY SUMMARY

Project: InsurAI Policy Intelligence System
Last Updated: 2026-03-15 (P7 complete, advancing to P8)

Core Architecture

- Backend: FastAPI
- Frontend: Next.js
- AI Orchestration: LlamaIndex + LangGraph
- Vector DB: Milvus (standalone, HNSW index, COSINE metric)
- Database: PostgreSQL
- Object Storage: MinIO (application) + MinIO-Milvus (Milvus segment store)
- Task Queue: Redis + Celery
- Authentication: Keycloak
- Embedding Provider: LiteLLM (text-embedding-3-small / nomic-embed-text)
- LLM Provider: LiteLLM (gpt-4o-mini; swappable via LLM_MODEL)
- Re-ranker: LiteLLM rerank() (bge-reranker-v2-m3 / cohere; swappable via RERANKER_MODEL)

Full Ingestion Pipeline (COMPLETE – P3 + P4)
Upload → MinIO → Celery Task: 1. Fetch raw bytes from MinIO 2. Extract text (PyMuPDF / python-docx / plain-text) 3. Store \_parsed.txt sidecar in MinIO 4. Semantic chunking (chunker.py – header+paragraph, 512-token window, 50-token overlap) 5. Generate embeddings (embedder.py – LiteLLM, batch=32) 6. Store \_chunks.json manifest in MinIO 7. Bulk insert into Milvus (vector_store.py – insert_vectors())
Final task status: "indexed"

RAG Retrieval Pipeline (COMPLETE – P5 T7 + T8)
retrieve(query, workspace_id, top_k): 1. Embed query → generate_embeddings() 2. Dense ANN → search_vectors() (3× candidates) 3. BM25Okapi re-rank, linear fusion ALPHA=0.7 4. Sort by fused score 5. Cross-encoder re-rank → reranker.rerank() via litellm.rerank() - Overwrites final_score; falls back to BM25 order on error - No-op if RERANKER_MODEL is empty string

RAG API Endpoints (COMPLETE – P5 + P6)
POST /api/v1/documents/upload → Celery ingestion → Milvus indexed
POST /api/v1/retrieve → retrieve() → RankedChunk list (all 3 scores)
POST /api/v1/chat → retrieve() → synthesize() → ChatResponse (blocking)
POST /api/v1/chat/stream → retrieve() → synthesize_stream() → SSE token stream

SSE Streaming (COMPLETE – P6 T9)
synthesize_stream(query, chunks, model): - Calls litellm.acompletion(stream=True) - Yields: data: {"token": "<text>"}\n\n for each delta - Yields: data: [DONE]\n\n on completion - On error: data: {"error": "..."}\n\n then data: [DONE]\n\n
stream_router.py: - Retrieval done synchronously before stream opens (503 if fails) - Sets Cache-Control: no-cache + X-Accel-Buffering: no

Frontend Modules (P7 T10 – in progress, 3 of 4 tasks complete)
Next.js 15 App Router, Tailwind CSS, no additional frameworks.
Dashboard pages are React Server Components; ChatPanel, ChatPageClient, SourcePanel, UploadPanel are "use client".
API calls proxied via next.config.ts rewrites → FastAPI:8000 (no CORS required).
streamChat(query, workspaceId) → POST /api/v1/chat/stream (SSE async generator)
fetchChatResponse(query, workspaceId) → POST /api/v1/chat (blocking; returns sources[])
uploadDocument(file, workspaceId) → POST /api/v1/documents/upload (multipart/form-data)
Citation flow: ChatPanel streams tokens → on complete → fetchChatResponse() → onCitations(sources) → ChatPageClient state → SourcePanel.

- frontend/app/chat/page.tsx – Server Component; delegates to ChatPageClient
- frontend/app/dashboard/layout.tsx – Shared sidebar nav (Overview, Underwriter, Compliance, Chat)
- frontend/app/dashboard/page.tsx – Role-selection landing with quick-action cards
- frontend/app/dashboard/underwriter/page.tsx – Underwriter tools shell
- frontend/app/dashboard/compliance/page.tsx – Compliance officer monitoring shell
- frontend/components/ChatPanel.tsx – SSE token-streaming chat UI ("use client"); lifts citations via onCitations prop
- frontend/components/ChatPageClient.tsx – Client wrapper; owns citations state; wires ChatPanel → SourcePanel ("use client")
- frontend/components/SourcePanel.tsx – Citation viewer: doc ID, relevance score badge, text preview ("use client")
- frontend/components/UploadPanel.tsx – Drag-and-drop PDF/DOCX upload ("use client")
- frontend/lib/api.ts – Typed fetch wrappers: streamChat(), fetchChatResponse(), uploadDocument()
- frontend/next.config.ts – /api/\* proxy rewrites to FastAPI backend

Backend Modules (COMPLETE – P1–P6)

- backend/app/core/config.py – Central settings (Pydantic)
- backend/app/storage/minio_client.py – MinIO upload/presign/delete
- backend/app/ingestion/router.py – POST /api/v1/documents/upload
- backend/app/ingestion/schemas.py – DocumentStatus, DocumentUploadResponse
- backend/app/workers/celery_app.py – Celery factory (Redis broker)
- backend/app/workers/ingestion_tasks.py – Full 7-step ingestion pipeline
- backend/app/processing/chunker.py – Header+paragraph semantic chunker
- backend/app/processing/embedder.py – LiteLLM embedding with batching
- backend/app/processing/vector_store.py – Milvus HNSW client (insert, search)
- backend/app/rag/retriever.py – 5-step hybrid retrieval service
- backend/app/rag/reranker.py – Cross-encoder re-ranker (litellm.rerank)
- backend/app/rag/synthesizer.py – Blocking + streaming LLM synthesis
- backend/app/rag/schemas.py – Chat + Retrieve + Stream Pydantic schemas
- backend/app/rag/router.py – POST /api/v1/chat
- backend/app/rag/retrieve_router.py – POST /api/v1/retrieve
- backend/app/rag/stream_router.py – POST /api/v1/chat/stream (SSE)
- docker-compose.yml – PostgreSQL, MinIO, Redis, etcd, Milvus, minio-milvus

Key Config Settings (all env-overridable)
EMBEDDING_MODEL, OPENAI_API_KEY
MILVUS_HOST, MILVUS_PORT, MILVUS_COLLECTION
LLM_MODEL, LLM_TEMPERATURE
RERANKER_MODEL (empty = skip re-ranking)

Known Clean-up Items

- ingestion_tasks.py imports private \_get_client() – refactor to public wrapper

Key Rules

- Milvus only (no Weaviate/Qdrant/Pinecone)
- LiteLLM only for embedding/LLM/rerank (no direct OpenAI/Cohere SDK)
- Commit limits: max 5 files, 350 lines per commit
- Protected files: system-architecture.md, roadmap.md, agent_task_graph.json
