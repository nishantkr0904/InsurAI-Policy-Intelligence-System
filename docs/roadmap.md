# Developer Implementation Roadmap: InsurAI

## 1. Project Overview
**InsurAI** is a Corporate Policy Automation & Intelligence System designed to automate the analysis, interpretation, and operational use of insurance policies, claims documentation, and corporate compliance policies. This developer roadmap translates the system architecture into executable implementation steps for an AI coding agent or developer team to build the platform.

## 2. Development Phases
The development lifecycle is organized into the following logical phases:
1. Foundation & Infrastructure
2. Authentication & Core Backend
3. Document Ingestion Pipeline
4. Vector Database & Embeddings
5. RAG Retrieval System
6. LLM Integration
7. Frontend Interface
8. Agentic Workflows
9. Security & Compliance
10. Testing & Evaluation
11. Deployment & Scaling

## 3. Phase Breakdown

### Phase 1: Foundation & Infrastructure
- **Goal**: Establish the base repository, initial structure, and localized development environment.
- **Components to Implement**: Docker Compose, Repository configuration, framework scaffolding.
- **Developer Tasks**:
  1. Initialize the monorepo structure (e.g., `frontend/`, `backend/`, `docker/`).
  2. Setup Next.js 15 (App Router), Tailwind CSS, and shadcn/ui in `/frontend`.
  3. Setup FastAPI backend with Poetry or `uv` via `/backend`.
  4. Create `docker-compose.yml` defining: PostgreSQL, MinIO, Redis, Keycloak, and Milvus.
  5. Configure standard linters (Prettier, ESLint, Ruff, Mypy) and pre-commit hooks.
- **Dependencies**: None.
- **Expected Outputs**: Running localized infrastructure, "Hello World" frontend and backend APIs communicating locally.

### Phase 2: Authentication & Core Backend
- **Goal**: Secure access to the system and establish the core relational models.
- **Components to Implement**: Keycloak configurations, API Gateway middleware, User/Role models, basic CRUD endpoints.
- **Developer Tasks**:
  1. Configure Keycloak realm, clients, and roles (Admin, Underwriter, Compliance, Customer).
  2. Implement OAuth2/OIDC login flow on the Next.js frontend.
  3. Add FastAPI authentication middleware to validate Keycloak JWTs.
  4. Set up SQLAlchemy ORM connecting to PostgreSQL.
  5. Define database schemas (Users, Workspaces, Documents, Audit Logs).
  6. Build CRUD APIs for workspace and document metadata management.
- **Dependencies**: Phase 1.
- **Expected Outputs**: Protected API endpoints, authenticated user session, initialized PostgreSQL schema.

### Phase 3: Document Ingestion Pipeline
- **Goal**: Implement the asynchronous pipeline to accept and process raw documents.
- **Components to Implement**: Upload APIs, Celery workers, MinIO object storage wrapper, document parsing engine.
- **Developer Tasks**:
  1. Implement FastAPI endpoint for file upload (with multipart/form-data support).
  2. Store raw uploaded files (PDF/Docs) in MinIO and save metadata to PostgreSQL.
  3. Configure Celery workers using Redis as the task broker.
  4. Implement document parsing logic using RAGFlow's DeepDoc or Upstage Document Parse within a Celery task perfectly preserving layout, tables, and clauses.
- **Dependencies**: Phase 2.
- **Expected Outputs**: Fully functioning async document uploader returning a Job ID, with the parsed textual structures saved.

### Phase 4: Vector Database & Embeddings
- **Goal**: Convert parsed text into vector embeddings and store them for semantic search.
- **Components to Implement**: Semantic chunking engine, Embedding generation service, Milvus connections.
- **Developer Tasks**:
  1. Implement semantic chunking heuristics (chunk by headers, paragraphs, and clauses).
  2. Connect embedding models (e.g., `text-embedding-3-small` or local `nomic-embed-text` via LiteLLM).
  3. Initialize Milvus collections and vector indices (e.g., HNSW).
  4. Build the ingestion pipeline step that maps chunks to embeddings and inserts them into Milvus alongside exact metadata (document ID, clause ID).
- **Dependencies**: Phase 3.
- **Expected Outputs**: Chunks and their embeddings correctly indexed inside Milvus.

### Phase 5: RAG Retrieval System
- **Goal**: Develop the semantic, keyword-based search, and reranking capabilities.
- **Components to Implement**: Hybrid search API, BM25 indexing (LlamaIndex integration), Re-ranker module.
- **Developer Tasks**:
  1. Develop hybrid retrieval queries (combining Milvus vector search with strict metadata filtering and keyword search).
  2. Integrate a cross-encoder model (e.g., `bge-reranker-v2-m3`) to re-score and sort the retrieved chunks.
  3. Expose a `/api/retrieve` endpoint testing the hybrid search given a text query.
- **Dependencies**: Phase 4.
- **Expected Outputs**: High-accuracy retrieval API returning the top-K relevant document contexts based on queries.

### Phase 6: LLM Integration
- **Goal**: Generate precise, grounded answers augmented by the retrieved contexts.
- **Components to Implement**: LLM orchestration, LiteLLM wrapper, Prompt Engineering.
- **Developer Tasks**:
  1. Integrate standard LLM providers (OpenAI/Anthropic) wrapped via LiteLLM.
  2. Construct system prompts emphasizing grounded generation using purely retrieved context.
  3. Develop logic to include explicit citation indices (links to source document pages/clauses).
  4. Build conversational API endpoints supporting streaming responses (SSE).
- **Dependencies**: Phase 5.
- **Expected Outputs**: Complete RAG pipeline API accepting a query and returning an LLM-generated string citing its sources.

### Phase 7: Frontend Interface
- **Goal**: Build the user-facing dashboards and chat interfaces.
- **Components to Implement**: Next.js App layouts, chat interface components, document viewer, workspaces.
- **Developer Tasks**:
  1. Build role-based routing (e.g., `/underwriter`, `/compliance`).
  2. Develop the Chat Interface utilizing React Server Components and handling SSE streams.
  3. Implement a dual-pane view: Chat reasoning on the left, PDF Source Viewer (highlighting retrieved chunks) on the right.
  4. Display data tables fetching workspace and document management APIs.
- **Dependencies**: Phase 2, Phase 6.
- **Expected Outputs**: Polished, functional UI allowing users to upload policies and chat with them.

### Phase 8: Agentic Workflows
- **Goal**: Upgrade simple QA into multi-step agentic reasoning (Claims logic, Compliance checking).
- **Components to Implement**: LangGraph workflows.
- **Developer Tasks**:
  1. Build a "Query Router" utilizing LangGraph to distinguish between standard retrieval, compliance check, and claim verification mode.
  2. Implement specific Agent states for extracting rules and evaluating complex overlapping clauses.
  3. Create specialized endpoints that trigger Agent sub-graphs to continuously loop until the compliance threshold is cleared.
- **Dependencies**: Phase 6.
- **Expected Outputs**: Advanced API endpoints showcasing autonomous multi-step reasoning over policy data.

### Phase 9: Security & Compliance
- **Goal**: Harden the application for enterprise and privacy standards.
- **Components to Implement**: PII Scrubber, Rate limiters, TLS/Encryption configurations.
- **Developer Tasks**:
  1. Introduce Microsoft Presidio inside the ingestion pipeline to redact personal health/financial data before embedding.
  2. Implement API Rate Limiting utilizing Redis on the FastAPI gateway.
  3. Establish Audit Logging middleware writing all incoming prompts and user queries into the relational DB.
- **Dependencies**: Phase 2, Phase 3.
- **Expected Outputs**: Secure, audited application capable of preventing PII ingestion natively.

### Phase 10: Testing & Evaluation
- **Goal**: Assure software reliability and AI accuracy.
- **Components to Implement**: Pytest suite, Next.js testing (Jest/Cypress), RAG evaluation matrix.
- **Developer Tasks**:
  1. Write unit tests for FastAPI CRUD logic and Celery ingestion tasks.
  2. Write E2E Cypress tests for the Next.js login and chat flows.
  3. Build a Ragas (RAG Assessment) pipeline evaluating Faithfulness, Answer Relevance, and Context Precision on a small benchmark dataset of policy documents.
- **Dependencies**: Phase 1-9.
- **Expected Outputs**: CI pipeline passing, establishing baseline accuracy metrics.

### Phase 11: Deployment & Scaling
- **Goal**: Move from local Docker to a cloud environment.
- **Components to Implement**: Kubernetes Manifests (Helm), CI/CD workflows, Cloud provisioning.
- **Developer Tasks**:
  1. Structure Helm charts (Deployment, Service, Ingress, Secrets) targeting Kubernetes.
  2. Set up GitHub Actions for building images, tagging, and pushing to a registry.
  3. Deploy the application into the targeted cloud cluster.
- **Dependencies**: Phase 10.
- **Expected Outputs**: Live system accessible via a secure HTTPS domain with functional external authentication.

## 4. System Modules
The major distinct code assemblies developers will implement:
- **API Gateway & Business Logic (`backend/api`)**: FastAPI server configuring HTTP routes, validation, and error handling.
- **Authentication Wrapper (`backend/auth`, `frontend/auth`)**: Keycloak specific token management and JWT decoders.
- **Async Ingestion Pipeline (`backend/workers`)**: Celery tasks targeting MinIO IO and Doc Parsing instances.
- **RAG & Search Core (`backend/rag`)**: Integrating LlamaIndex, LiteLLM, and Milvus operations.
- **LLM Orchestration (`backend/agents`)**: LangGraph state definitions and multi-stage nodes.
- **Web Client (`frontend/`)**: Next.js pages, React Query hooks, Tailwind styling.

## 5. Implementation Order
To mitigate integration blocking, strictly adhere to this order:
1. **Infrastructure (Docker-compose)**: Enables local environments.
2. **Database & API Foundation**: Connects FastAPI -> PG + MinIO.
3. **Authentication**: Injects RBAC before any complex logic locking down routes.
4. **Ingestion Service**: Needed to populate data; testing RAG is impossible without ingested documents.
5. **Vector DB integration & Retrieval**: The core search API testing contexts.
6. **LLM Generation Component**: Wraps the retrieval layer.
7. **Frontend Core UI**: Connects to the exposed backend flows.
8. **Agentic Layer (LangGraph)**: Enhances existing RAG endpoints.
9. **Security, Testing, & Deployment DevOps**.

## 6. AI Pipeline Implementation Details
1. **Document Parsing**: Utilize DeepDoc / Multimodal models rather than simple PyPDF2. Maintain parent node relations (e.g., maintaining table shapes).
2. **Semantic Chunking**: Split primarily by Markdown headers or section numbering (`Clause 1.1`). Keep chunks around 512–1024 tokens. Maintain a 10% overlap window.
3. **Embeddings**: Employ `text-embedding-3-small` (or equivalent open-source) to transform the chunks into high-dimensional vectors. Provide metadata dictionaries along with the vectors to Milvus.
4. **Hybrid Retrieval**: Search Milvus using semantic similarity (Cosine Distance) and standard keyword metrics (BM25), combining indices utilizing rank fusion algorithms.
5. **Reranking**: Utilize a Cross-Encoder to evaluate the generated hybrid context blocks deeply and discard strictly irrelevant or unhelpful chunks.
6. **Grounded Answer Generation**: Use Claude 3.5 Sonnet / GPT-4o with strict prompts enforcing "Use exclusively the following context." Append citation annotations referring to `doc_id` and `page_number` directly into the text stream.

## 7. Infrastructure Setup
The `docker-compose.yml` will initialize:
- **PostgreSQL 16+**: Standard relational store at port 5432.
- **MinIO**: S3-compatible backend running with console at port 9001 and API at 9000.
- **Milvus**: Distributed vector store with Etcd/MinIO dependencies mapped globally at port 19530.
- **Redis**: In-memory cache and task broker at port 6379.
- **Keycloak**: IAM instance at port 8080.
- **FastAPI / Next.js**: Locally mounted code serving at ports 8000 / 3000 interchangeably.

## 8. Integration Points
- **Ingestion → Embeddings → Vector DB**: Celery worker picks file from MinIO -> calls Parsing framework -> chunked arrays sent directly to the local Embeddings model -> output vectors batch-inserted via Milvus SDK.
- **Retrieval → Reranking → LLM Reasoning**: FastAPI route matches query -> Requests Milvus -> Results mapped through Cross-Encoder via PyTorch/LiteLLM -> Filtered textual context injected into LangGraph state for the final generation prompt.
- **Frontend → Backend → AI Services**: Next.js client utilizes Server Actions or direct standard fetch hooks for auth/CRUD, and connects via SSE to the Backend `/chat` route mapping directly to the LLM orchestrator output streams.

## 9. Testing Strategy
- **Ingestion Testing**: Unit tests feeding mock complex PDFs assuring clauses and tables reflect accurate string formatting post-parse.
- **Retrieval Accuracy**: Utilizing `ragas` library validating recall and MRR (Mean Reciprocal Rank) metrics against an annotated "Gold Standard" Q&A pairs list from sample insurance policies.
- **RAG Responses**: Evaluation asserting the LLM correctly ignores queries falling outside context windows to prevent hallucinations.
- **Authentication**: E2E testing login states mapping Keycloak redirects accurately.
- **System Reliability**: Stress tests evaluating Celery load handling parsing 100+ documents concurrently.

## 10. Deployment Plan
- **Packaging**: Both Next.js and FastAPI repos feature streamlined multi-stage Dockerfiles.
- **Container Orchestration**: Kubernetes Deployment utilizing ConfigMaps for environment variables and Secrets for API Keys/Database certs.
- **Services**: Expose Next.js through an External Loadbalancer. API Gateway runs internal routing avoiding expose limits.
- **CI/CD Pipeline**: GitHub Actions triggered upon PR to `main` branch: runs linters, unit tests -> on merge, builds Docker images -> push to DockerHub/ACR -> applies Helm upgrade sequentially to a staging cluster.

## 11. Milestones
- **Milestone 1**: Local Dev Environment & Authentication completed (Base logic ready).
- **Milestone 2**: Async Ingestion Pipeline & Chunking live (Data feeding possible).
- **Milestone 3**: Core RAG System APIs operational (Context retrieval functioning).
- **Milestone 4**: UI Dashboard + Basic LLM Chat complete (System usable end-to-end).
- **Milestone 5**: Agentic Compliance workflows developed.
- **Milestone 6**: Accuracy Testing & Enterprise hardening complete. Release Candidate available.
