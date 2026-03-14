# InsurAI – Corporate Policy Automation and Intelligence System
**Architecture & Implementation Plan (State-of-the-Art 2025)**

## 1. Overall System Architecture
The InsurAI platform follows a **microservices-based, event-driven architecture** built around a powerful Agentic RAG (Retrieval-Augmented Generation) core. The architecture separates concerns into:
- **Client Layer:** A web-based frontend for internal (officers, underwriters) and external (customers, brokers) users.
- **API Gateway & Auth Layer:** Centralized routing and identity management enforcing Role-Based Access Control (RBAC).
- **Core Business Services:** Microservices handling user management, policy CRUD, and analytics.
- **AI & RAG Engine:** A specialized Python-based orchestrator utilizing LangGraph and LlamaIndex for intelligent retrieval, compliance checks, and claims analysis.
- **Asynchronous Data Ingestion Pipeline:** A worker-based pipeline to parse, chunk, embed, and index massive volumes of unstructured policies (PDFs, Word documents).
- **Data Persistence Layer:** Segregated storage using a Vector DB for embeddings, an Object Store for raw files, and a Relational DB for structured metadata.

## 2. Recommended Technology Stack (2025 focus on Open-Source & Enterprise Scale)
- **Frontend:** Next.js 15 (React), Tailwind CSS, shadcn/ui
- **Backend APIs:** FastAPI (Python) – standard for AI ecosystems, high-performance async capabilities.
- **AI Orchestration:** LlamaIndex (for data connectors & efficient indexing) + LangGraph (for multi-agent workflows like claims vs. compliance tracking).
- **Document Parsing:** RAGFlow's DeepDoc or Upstage Document Parse – state-of-the-art in preserving multimodal complex document structures (tables, clauses).
- **Vector Database:** Milvus (highly scalable, open-source, cloud-ready) or Qdrant (Rust-based, lightning fast).
- **Relational DB:** PostgreSQL (with pgvector as a fallback/hybrid option).
- **Object Storage:** MinIO (S3-compatible open-source storage).
- **Message Broker / Queue:** RabbitMQ or Redis + Celery for background ingestion jobs.
- **Orchestration/Deployment:** Docker + Kubernetes (K8s) configuration via Helm.

## 3. Backend Architecture
The backend uses **Python/FastAPI** to easily integrate with the latest AI libraries without IPC overhead. 
- **API Gateway Module:** Handles rate limiting and routes requests to either Business Logic or AI Logic.
- **Core Service:** Manages relational entities (Users, Workspaces, Audit Logs, Analytics).
- **AI/LLM Service:** Exposes specific endpoints for conversational querying (`/api/chat/policies`), summarization (`/api/summarize`), and compliance flagging (`/api/compliance/check`).

## 4. Frontend Architecture
Built with **Next.js (App Router)** to support both React Server Components (improving load times and SEO) and interactive client side features.
- State management via Zustand and React Query for fetching.
- **Dashboard Views:** Role-specific dashboards. Underwriters see risk-assessment tools, Compliance officers see regulatory flag monitors.
- **Chat Interface:** A ChatGPT-like streaming conversational UI referencing source document citations via WebSockets or Server-Sent Events (SSE).

## 5. Authentication and Authorization System
- **Provider:** **Keycloak** (Open Source Identity and Access Management). Keycloak provides robust support for enterprise OIDC, SAML, and SSO.
- **Implementation:** 
  - JWT (JSON Web Tokens) are issued upon login.
  - The API Gateway validates tokens and extracts RBAC roles.
  - Granular permissions (e.g., external customers can only query *their own* policy files, internal auditors can query *all* policies).

## 6. Document Ingestion Pipeline
Since insurance policies run hundreds of pages with complex tables:
1. **Upload:** User uploads a PDF to MinIO; an event is queued in RabbitMQ/Redis.
2. **Parsing (DeepDoc/OCR):** A Celery worker picks up the job. It uses Vision-Language Models (VLMs) to accurately extract text while maintaining layout (identifying headers, clauses, and tables).
3. **Semantic Chunking:** Text is chunked logically based on headers/clauses rather than naive character counts (preventing "Lost in the Middle" syndrome).
4. **Embedding Generation:** Chunks are passed through an embedding model (e.g., `nomic-embed-text` or `text-embedding-3-small`).
5. **Storage:** Vectors and metadata (document ID, page number, clause section) are written to the Vector DB. Structured metadata goes to PostgreSQL.

## 7. RAG Architecture for Policy Intelligence
The RAG pipeline will use an **Agentic / Graph RAG approach**:
- **Query Classification:** An LLM router determines if the query is a simple retrieval ("What is the deductible?") or complex reasoning ("Does this sequence of events violate policy X clause Y?").
- **Hybrid Retrieval:** Combing Vector Search (Semantic) with BM25 (Keyword search) to ensure exact matches on specific insurance codes or clause IDs.
- **Context Re-ranking:** A Cross-Encoder model re-ranks retrieved chunks to pull the most relevant context to the top.
- **Grounded Generation:** The LLM generates the answer with enforced citations linked back to the original document pages.

## 8. Vector Database Recommendations
**Milvus** is the top recommendation for an enterprise-scale, cloud-deployable platform. It scales linearly to handle billions of vectors, supports hybrid search, and has built-in multi-tenancy (crucial for segregating data between different corporate clients or departments). **Qdrant** is an excellent alternative if starting smaller but needing extreme speed.

## 9. LLM Integration Strategy
To balance cost, privacy, and performance:
- **Primary LLM (Complex Reasoning):** OpenAI GPT-4o or Anthropic Claude 3.5 Sonnet via API. Claude is heavily preferred for long document context and strict adherence to structural instructions (ideal for complex claims logic).
- **Open Source / Local Fallback (Privacy Priority):** DeepSeek-R1 or Llama-3 (8B/70B) hosted via vLLM on enterprise GPUs. DeepSeek-R1 exhibits state-of-the-art open-source reasoning behavior, crucial for compliance logic.
- **Integration Layer:** Access models via LiteLLM to standardize API calls, allowing easy swapping of models without code refactoring.

## 10. Security Architecture
- **Data Encryption:** TLS 1.3 for data in transit; AES-256 for data at rest (MinIO and PostgreSQL volumes).
- **Prompt Injection Defense:** Input sanitization layer before queries hit the LLM. 
- **PII Redaction:** Implement a PII presidio scrubber during the document ingestion pipeline to mask sensitive customer healthcare or financial info before embedding/LLM processing.
- **Audit Trails:** Every query and uploaded document is logged with a timestamp and user ID in PostgreSQL for compliance auditing.

## 11. Data Storage Strategy
- **PostgreSQL:** Users, Roles, Audit Logs, App Metadata, Document Metadata.
- **MinIO (Object Storage):** Original PDFs / Word documents, generated Reports.
- **Milvus (Vector DB):** High-dimensional vector embeddings, chunk text, quick-filter tags.
- **Redis:** Caching LLM responses, rate limiting, and managing async task queues.

## 12. Deployment Architecture
- **Containerization:** All services dockerized.
- **Orchestration:** Kubernetes (K8s) or Docker Swarm. K8s allows for easy autoscaling of the heavy ingestion workers independently from the FastAPI web server.
- **Cloud Provider:** Can be deployed on AWS/GCP/Azure, or on-premises using OpenShift, keeping in line with the "cloud-deployable" yet data-private constraints.
- **CI/CD:** GitHub Actions to run tests, build Docker images, and deploy.

## 13. Step-by-Step Development Roadmap (Academic Project)

**Phase 1: Foundation & Infrastructure (Weeks 1-2)**
- Set up GitHub repo, Docker Compose file with dependencies (PostgreSQL, MinIO, Milvus, Redis, Keycloak).
- Initialize Next.js frontend and FastAPI backend.

**Phase 2: Authentication & Basic CRUD (Weeks 3-4)**
- Configure Keycloak and implement RBAC.
- Build UI and APIs for file upload to MinIO and basic user dashboard.

**Phase 3: The Data Ingestion Pipeline (Weeks 5-7)**
- Implement Celery workers for document parsing.
- Integrate PDF/OCR parsing (e.g., LlamaParse or DeepDoc).
- Generate embeddings and store them into Milvus.

**Phase 4: Core RAG & LLM Engine (Weeks 8-10)**
- Implement hybrid search logic in FastAPI.
- Wire up LLM API (Claude/GPT/DeepSeek) using LlamaIndex/Langchain.
- Implement conversational chat UI in Next.js with streaming responses.

**Phase 5: Agentic Features & Workflows (Weeks 11-13)**
- Add specialized LangGraph agents for specific tasks (Claims Assistant agent, Compliance Checker agent).
- Build the Analytics and Insights dashboard (extracting risk trends from logged queries/metadata).

**Phase 6: Hardening & Testing (Weeks 14-16)**
- Implement PII redaction and audit logging.
- Perform load testing, benchmark retrieval accuracy.
- Final UI polish and academic documentation/presentation prep.

---
## Verification Plan
*Since this is an architecture design phase, verification focuses on readiness and validation of the plan.*
- **Review:** Present this Implementation Plan to stakeholders (the USER) for design approval.
- **Feasibility Test:** Developers setup a local Docker Compose featuring Keycloak, FastAPI, and Milvus to verify communication pathways before full implementation.
