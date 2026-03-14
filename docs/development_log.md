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

## Next Tasks
- [ ] `minio_integration` – Wire Docker Compose MinIO service and test bucket creation on startup
- [ ] `worker_pipeline` – Implement Celery worker that picks up the `document_id` and triggers parsing (T4 continuation → T5)

## Phase Status
| Phase | Status |
|-------|--------|
| P1 – Infrastructure | 🟡 In Progress (docker-compose pending) |
| P2 – Auth & Core Backend | ✅ Complete |
| P3 – Document Ingestion | 🟡 In Progress (upload endpoint done, worker pending) |
| P4 – Embedding & Indexing | ⬜ Pending |
| P5 – RAG Retrieval | ⬜ Pending |
| P6 – Chat Interface | ⬜ Pending |
| P7 – Frontend | ⬜ Pending |
| P8 – Security & Logging | ⬜ Pending |
| P9 – Testing | ⬜ Pending |
| P10 – Deployment | ⬜ Pending |
