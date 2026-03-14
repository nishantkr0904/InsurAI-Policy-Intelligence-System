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

## Next Tasks
- [ ] Phase P4: Implement embedding service (T5)
- [ ] Semantic chunking of parsed sidecar text
- [ ] Milvus vector database integration (T6)

## Phase Status
| Phase | Status |
|-------|--------|
| P1 – Infrastructure | ✅ Complete (docker-compose live) |
| P2 – Auth & Core Backend | ✅ Complete |
| P3 – Document Ingestion | ✅ **Complete** (upload + MinIO + worker pipeline) |
| P4 – Embedding & Indexing | 🟡 Next |
| P5 – RAG Retrieval | ⬜ Pending |
| P6 – Chat Interface | ⬜ Pending |
| P7 – Frontend | ⬜ Pending |
| P8 – Security & Logging | ⬜ Pending |
| P9 – Testing | ⬜ Pending |
| P10 – Deployment | ⬜ Pending |
