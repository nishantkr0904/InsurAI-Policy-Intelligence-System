# Backend Task Tracker

## ✅ Completed Tasks

### Phase 1: Foundation & Infrastructure
- ✅ **Docker-compose setup**: PostgreSQL, MinIO, Redis, Milvus, Keycloak
- ✅ **FastAPI scaffolding**: CORS, health checks, lifespan handlers

### Phase 2: Authentication & Core Backend
- ✅ **Keycloak integration**: Realm/clients/roles configured
- ✅ **FastAPI auth middleware**: JWT validation stubs integrated
- ✅ **SQLAlchemy ORM**: Connected to PostgreSQL (schemas defined)

### Phase 3: Document Ingestion Pipeline
- ✅ **FR001 – Upload Policy Documents**: `POST /api/v1/documents/upload`
  - Accepts PDF/DOCX/TXT, validates file type/size (50MB max)
  - Stores in MinIO, enqueues Celery ingestion job
  - Returns DocumentUploadResponse with status=PENDING

- ✅ **FR006 – Document Status Tracking**: `GET /api/v1/documents`
  - Lists workspace documents from MinIO with metadata
  - Status badges: PENDING, PROCESSING, INDEXED, ERROR

### Phase 4: Vector Database & Embeddings
- ✅ **FR002 – Document Parsing**: `ingest_document` Celery task
  - Extracts text from PDF (PyMuPDF), DOCX (python-docx), TXT
  - Stores parsed text as sidecar in MinIO

- ✅ **FR003 – Document Chunking**: `chunker.py` semantic chunking
  - Header/section-based splitting
  - 512 tokens per chunk, 50-token overlap
  - Returns TextChunk objects with metadata

- ✅ **FR004 – Embedding Generation**: `embedder.py` via LiteLLM
  - Supports OpenAI text-embedding-3-small
  - Batching support (32 chunks per API call)
  - Returns List[List[float]] embeddings

- ✅ **FR005 – Document Indexing**: `vector_store.py` Milvus integration
  - Creates milvus_chunks collection
  - Inserts vectors with document_id, workspace_id, chunk_index metadata

### Phase 5: RAG Retrieval System
- ✅ **FR008 – Retrieval-Augmented Response**: Hybrid search pipeline
  - Milvus dense vector search (cosine distance)
  - BM25 keyword search fallback
  - Cross-encoder reranking using LiteLLM

- ✅ **FR010 – Source Citation**: SourceCitation objects returned
  - document_id, page_number, snippet_text, relevance_score

### Phase 6: LLM Integration
- ✅ **FR007 – AI Policy Chat**: `POST /api/v1/chat`
  - Query → Retrieve → Synthesize → Return ChatResponse
  - Supports custom model selection
  - Includes token usage tracking

- ✅ **FR009 – Contextual AI Answers**: Streaming synthesis
  - GPT-4/Claude generates grounded answers
  - Cites source documents and pages

- ✅ **Streaming Chat**: `POST /api/v1/chat/stream`
  - SSE token-by-token streaming
  - `data: {"token": "..."}` format

### Phase 7: Frontend Interface
- ✅ **Frontend implementation**: Next.js 15 with all features
  - Chat interface, document upload, status tracking
  - Dashboard, analytics, role-based routing

### Phase 7.5: Domain-Specific APIs (NEW)
- ✅ **FR013 – Claim Policy Validation**: `POST /api/v1/claims/validate`
  - Validates claims against policy documents using RAG
  - Returns: approval_status, risk_score, severity, reasoning, referenced_clauses
  - Supports: health, auto, home, life, disability, property, liability claim types
  - Integrates seamlessly with existing RAG pipeline

- ✅ **FR014 – Coverage Explanation** (implemented as part of FR013)
  - AI-generated reasoning with referenced policy clauses
  - Clause violation detection
  - Related through ClaimValidationResponse.reasoning + referenced_clauses fields

- ✅ **FR016 – Fraud Pattern Detection**: `GET /api/v1/fraud/alerts`
  - Detects fraud patterns and anomalies
  - Returns: fraud alerts with risk scores, severity, anomaly types
  - Supports: filtering (status, severity, min_risk_score), pagination, sorting
  - Includes related claims analysis with similarity scores
  - Provides investigation support with evidence panels

- ✅ **FR017 – Fraud Alert Generation** (implemented as part of FR016)
  - Generates structured fraud alerts with metadata
  - Supports: NEW, UNDER_REVIEW, ESCALATED, RESOLVED statuses
  - Includes: alert_id, claim_id, risk_score, anomaly_types, confidence_score

- ✅ **FR018 – Fraud Investigation Support** (implemented as part of FR016)
  - Investigation panels with related claims
  - Related claims with similarity scores
  - Evidence organization for fraud analysis

---

## 🚧 In Progress

> No tasks currently in progress.

---

## ❌ Remaining Backend Tasks

### High Priority (Required for MVP)

#### 1. **FR019 – Compliance Review API**
**Status**: ❌ NOT STARTED
**Endpoint**: `GET /api/v1/compliance/issues`
**Description**: Return compliance issues against regulatory standards
**Breaking Down**:
- [ ] Create ComplianceIssue model (issue_id, rule_name, severity, status, description)
- [ ] Create ComplianceIssuesResponse schema
- [ ] Implement compliance checking logic: audit policies against rules
- [ ] Return paginated issues with severity breakdown
- [ ] Support report generation

**Frontend Dependency**: `/compliance` page expects this endpoint

---

#### 2. **FR021 – Audit Policy History API**
**Status**: ❌ NOT STARTED
**Endpoint**: `GET /api/v1/audit`, `POST /api/v1/audit/action`
**Description**: Log and retrieve system audit trails
**Breaking Down**:
- [ ] Create AuditLog model (log_id, user_id, action, resource, status, timestamp)
- [ ] Create AuditLogRequest/Response schemas
- [ ] Implement audit logging: intercept all user actions
- [ ] Return paginated audit log with filtering/search
- [ ] Compute analytics: top actions, user activity, success rates

**Frontend Dependency**: `/audit` page expects this endpoint

---

### Medium Priority (Infrastructure & Polish)

#### 5. **FR024 – Workspace Isolation**
**Status**: ❌ NOT STARTED
**Description**: Multi-tenant data isolation at the database level
**Breaking Down**:
- [ ] Add workspace_id foreign key to all data models
- [ ] Add workspace filtering to all queries
- [ ] Implement workspace authorization checks in routers
- [ ] Test isolation with multiple workspaces

---

#### 6. **FR028 – Activity Logging**
**Status**: ❌ NOT STARTED
**Description**: Middleware to log all API requests/responses
**Breaking Down**:
- [ ] Create ActivityLog model
- [ ] Implement FastAPI middleware for logging
- [ ] Log: user_id, endpoint, method, status, timestamp, duration
- [ ] Expose via `/api/v1/audit`

---

#### 7. **FR029 – Error Monitoring**
**Status**: ❌ NOT STARTED
**Description**: Capture and report errors in ingestion/indexing pipelines
**Breaking Down**:
- [ ] Create ErrorLog model
- [ ] Add try-catch with logging to Celery tasks
- [ ] Store errors in PostgreSQL
- [ ] Expose via admin endpoint

---

#### 8. **FR030 – Performance Monitoring**
**Status**: ❌ NOT STARTED
**Description**: Track API latency, AI processing time, retrieval speed
**Breaking Down**:
- [ ] Add timing instrumentation to key functions
- [ ] Create PerformanceMetric model
- [ ] Expose metrics via `/api/v1/metrics`

---

## 📋 Implementation Order

**Following roadmap dependency chain:**
1. ✅ Phase 1-6: Foundation, Auth, Ingestion, RAG, LLM (COMPLETED)
2. ⏳ **Phase 7.5: Domain-Specific APIs** (NEXT)
   - Start with FR013 (Claims Validation)
   - Then FR016 (Fraud Detection)
   - Then FR019 (Compliance Review)
   - Then FR021 (Audit Trail)
3. ⏳ Phase 8: Agentic Workflows (after domain APIs)
4. ⏳ Phase 9: Security & Compliance hardening
5. ⏳ Phase 10: Testing & Evaluation
6. ⏳ Phase 11: Deployment & K8s

---

## Current Blocking Issues

None – RAG pipeline is fully functional and domain APIs can be built independently.

---

## Notes

- All Celery/async ingestion is working
- Milvus vector indexing is functional
- RAG retrieval + LLM synthesis is production-ready
- Frontend has mock implementations of domain APIs (ready to wire to backend)
