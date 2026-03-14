# InsurAI – Development Log

This file is updated after every commit cycle per the agent execution contract.

---

## 2026-03-15

### Commit 1 – `feat(backend): scaffold FastAPI backend with core config`
- **Files created:**
  - `backend/app/__init__.py`
  - `backend/app/core/__init__.py`
  - `backend/app/core/config.py`
  - `backend/app/storage/__init__.py`
- **Summary:** Initialized backend package structure and central Pydantic-Settings config reading from `.env`.
- **Lines added:** ~40

---

### Commit 2 – `feat(storage): add MinIO object storage client`
- **Files created:**
  - `backend/app/storage/minio_client.py`
- **Summary:** Implemented `upload_file`, `get_presigned_url`, `delete_file`, and `ensure_bucket_exists`. Namespaced objects by `workspace_id/{uuid}.{ext}`.
- **Lines added:** ~115

---

### Commit 3 – `feat(ingestion): add upload router and document schemas`
- **Files created:**
  - `backend/app/ingestion/__init__.py`
  - `backend/app/ingestion/schemas.py`
  - `backend/app/ingestion/router.py`
- **Summary:** Upload endpoint `POST /api/v1/documents/upload` with MIME allowlist, 50 MB cap, MinIO delegation, and `DocumentUploadResponse` returning `status=PENDING`.
- **Lines added:** ~135

---

### Commit 4 – `feat(app): register ingestion router in main.py + add pyproject.toml`
- **Files created:**
  - `backend/app/main.py`
  - `backend/pyproject.toml`
  - `backend/.env.example`
- **Summary:** FastAPI app entry point, CORS configured for Next.js dev server, `/health` probe, Poetry manifest with Phase P3 dependencies only.
- **Lines added:** ~90

---

---

### Commit 5a – `chore(infra): add docker-compose for PostgreSQL, MinIO, and Redis local services`
- **Files created:**
  - `docker-compose.yml`
- **Summary:** Services defined: PostgreSQL 16, MinIO (with one-shot `mc` bucket init container), Redis 7. All services include healthchecks.
- **Lines added:** 98

---

### Commit 5b – `feat(startup): auto-initialize MinIO bucket via FastAPI lifespan event`
- **Files modified:**
  - `backend/app/main.py`
- **Summary:** Added `asynccontextmanager` lifespan handler. On startup, calls `ensure_bucket_exists()`. Logs a warning (does not crash) if MinIO is unreachable.
- **Lines added:** 36

---

### Commit 6 – `feat(worker): add Celery ingestion task with PDF/DOCX parsing and MinIO sidecar storage`
- **Files created:**
  - `backend/app/workers/__init__.py`
  - `backend/app/workers/celery_app.py`
  - `backend/app/workers/ingestion_tasks.py`
- **Files modified:**
  - `backend/app/ingestion/router.py` – wired `ingest_document.delay()` replacing stub comment
  - `backend/pyproject.toml` – added `pymupdf` and `python-docx`
- **Summary:** Full async ingestion pipeline. Upload → MinIO → Celery task enqueued → worker fetches file → extracts text (PyMuPDF/python-docx) → stores parsed sidecar `.txt`. Max 3 retries with exponential backoff.
- **Lines added:** 204

---

---

### Commit 7a – `feat(chunking): add semantic text chunker with header and paragraph splitting`
- **Files created:**
  - `backend/app/processing/__init__.py`
  - `backend/app/processing/chunker.py`
- **Summary:** Header-aware chunker using stdlib `re` only. Splits on Clause/Section/Article keywords and ALL-CAPS headings, then by paragraphs. Configurable max token window (default 512) with 50-token overlap between chunks.
- **Lines added:** 186

---

### Commit 7b – `feat(embedding): add LiteLLM embedding service with batching and dimension lookup`
- **Files created:**
  - `backend/app/processing/embedder.py`
- **Files modified:**
  - `backend/app/core/config.py` – added `EMBEDDING_MODEL`, `OPENAI_API_KEY` settings
  - `backend/pyproject.toml` – added `litellm ^1.40.0`
- **Summary:** `generate_embeddings()` accepts a list of texts, calls `litellm.embedding()` in configurable batches (default 32), returns `List[List[float]]`. `embedding_dimension()` helper maps model names to vector sizes for Milvus schema creation in T6.
- **Lines added:** 136

---

### Commit 7c – `feat(worker): extend ingestion task with semantic chunking and embedding generation`
- **Files modified:**
  - `backend/app/workers/ingestion_tasks.py`
- **Summary:** After text extraction, task now calls `chunk_text()` → `generate_embeddings()` → stores `{uuid}_chunks.json` manifest in MinIO. Each chunk record includes `text`, `char_start`, `char_end`, `token_estimate`, and `embedding` vector. Task return status updated to `"embedded"`. This JSON sidecar is the direct input interface for T6 (Milvus insert).
- **Lines added:** 47

---

### Commit 8 – `docs(state): update runtime state, context memory, and development log`
- **Files modified:**
  - `docs/agent_runtime_state.json` – phase advanced to P4, current task set to T6, full completed task list
  - `docs/context_memory.md` – full module inventory, MinIO sidecar contract, current pipeline status
  - `docs/development_log.md` – this entry
- **Lines added:** ~80

---

## Next Tasks
- [ ] **T6** – Milvus client wrapper (`processing/vector_store.py`)
- [ ] **T6** – Vector insert pipeline: read `_chunks.json` sidecar → insert into Milvus collection
- [ ] **T6** – Milvus collection schema creation on startup (using `embedding_dimension()`)

## Phase Status
| Phase | Status |
|-------|--------|
| P1 – Infrastructure | ✅ Complete |
| P2 – Auth & Core Backend | ✅ Complete |
| P3 – Document Ingestion | ✅ Complete |
| P4 – Embedding & Indexing | 🟡 **In Progress** (T5 ✅ done, T6 pending) |
| P5 – RAG Retrieval | ⬜ Pending |
| P6 – Chat Interface | ⬜ Pending |
| P7 – Frontend | ⬜ Pending |
| P8 – Security & Logging | ⬜ Pending |
| P9 – Testing | ⬜ Pending |
| P10 – Deployment | ⬜ Pending |
