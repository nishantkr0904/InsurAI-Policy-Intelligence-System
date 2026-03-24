<div align="center">

# 🛡️ InsurAI

### **AI-Powered Policy Intelligence for Modern Insurance**

Transform months of policy review into minutes. InsurAI leverages enterprise-grade RAG and agentic AI to automate claims validation, fraud detection, and compliance auditing—with every answer grounded in your actual policy documents.

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com/)
[![Tests](https://img.shields.io/badge/Tests-55%20Passing-success?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Demo](#-demo--screenshots) • [Features](#-core-features) • [Architecture](#-architecture-overview) • [Quick Start](#-getting-started) • [API Docs](#-api-overview)

---

<img src="docs/assets/dashboard-preview.png" alt="InsurAI Dashboard" width="100%"/>

_AI-powered policy analysis with real-time fraud detection and compliance monitoring_

</div>

---

## 🔴 The Problem

Insurance operations are drowning in manual processes that don't scale:

| Challenge                | Impact                                                        |
| ------------------------ | ------------------------------------------------------------- |
| 📄 **Policy Review**     | Underwriters spend **60% of time** reading documents manually |
| ⏳ **Claims Processing** | Average **15-30 days** for complex claims decisions           |
| 💸 **Fraud Detection**   | **$80B+ annual losses** to insurance fraud in US alone        |
| 📋 **Compliance**        | Manual audits cost **$50K-500K** per regulatory review        |
| 🔒 **Knowledge Silos**   | Critical policy knowledge locked in unstructured PDFs         |

> **Traditional systems can't scale. Manual review can't keep up. Insurance needs AI that actually understands policies.**

---

## 💡 The Solution

**InsurAI** is an enterprise AI platform that transforms how insurance organizations handle policies, claims, and compliance.

### What makes it different:

| Feature                      | Benefit                                                   |
| ---------------------------- | --------------------------------------------------------- |
| 🎯 **Grounded AI Responses** | Every answer cites exact policy clauses and page numbers  |
| 🔍 **Hybrid Retrieval**      | Combines semantic search + keyword matching for precision |
| 🤖 **Agentic Workflows**     | Multi-step reasoning for complex claims validation        |
| 🏢 **Enterprise Security**   | RBAC, workspace isolation, full audit trails              |
| ⚡ **Real-time Streaming**   | SSE-powered responses for instant feedback                |

---

## 🏗️ Architecture Overview

InsurAI follows a **microservices architecture** with clear separation between the API layer, AI engine, and data stores.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 15)                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │ Dashboard │  │  Policy   │  │  Claims   │  │   Fraud   │  │Compliance │ │
│  │           │  │   Chat    │  │Validation │  │  Alerts   │  │   Audit   │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                SSE / REST API
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (FastAPI)                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           API Gateway                                  │ │
│  │     Auth Middleware  │  Rate Limiting  │  Activity Logging            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │ Document  │  │    RAG    │  │  Claims   │  │   Fraud   │  │Compliance │ │
│  │  Ingest   │  │  Engine   │  │  Service  │  │  Service  │  │  Service  │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
           │               │               │
           ▼               ▼               ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│    Celery     │  │    LiteLLM    │  │   LangGraph   │
│    Workers    │  │  (GPT-4 /     │  │    Agents     │
│               │  │   Claude)     │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
           │               │               │
           ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │PostgreSQL │  │  Milvus   │  │   MinIO   │  │   Redis   │  │ Keycloak  │ │
│  │ Metadata  │  │  Vectors  │  │   Files   │  │   Cache   │  │   Auth    │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Layer            | Technology                     | Purpose                                |
| ---------------- | ------------------------------ | -------------------------------------- |
| **Frontend**     | Next.js 15, React 19, Tailwind | Role-based dashboards, real-time chat  |
| **API**          | FastAPI, SQLAlchemy, Pydantic  | 41+ RESTful endpoints, auth middleware |
| **AI Engine**    | LlamaIndex, LangGraph, LiteLLM | RAG retrieval, agentic reasoning       |
| **Vector Store** | Milvus (HNSW)                  | Semantic search over policy embeddings |
| **Task Queue**   | Celery + Redis                 | Async document processing pipeline     |
| **Storage**      | MinIO, PostgreSQL              | S3-compatible objects, relational data |
| **Auth**         | Keycloak                       | OIDC, RBAC, workspace isolation        |

---

## ⚙️ Core Features

### 💬 AI Policy Chat

Ask questions in natural language. Get accurate answers with source citations.

```
User: "Is flood damage covered under policy HO-2024-8891?"

InsurAI: "Flood damage is NOT covered under this policy.

According to Section 4.2 (Exclusions), Page 12:
'This policy does not cover losses caused by flood, surface water,
waves, or overflow of any body of water.'

For flood coverage, see the optional Flood Endorsement (Form FE-100)."

📄 Sources: policy-ho2024.pdf (p.12), endorsements.pdf (p.3)
```

- ✅ Real-time SSE streaming responses
- ✅ Multi-document querying
- ✅ Confidence scoring with low-confidence warnings
- ✅ Clickable source citations with PDF viewer

---

### ⚖️ Claims Validation Engine

Automatically validate claims against policy clauses with AI-powered reasoning.

| Feature                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| 📊 **Risk Scoring**      | 0-100 risk assessment with severity classification |
| 📑 **Coverage Analysis** | Maps claim details to specific policy clauses      |
| ✅ **Decision Support**  | Approve, reject, or escalate recommendations       |
| 📝 **Audit Trail**       | Full logging of AI reasoning and human overrides   |

---

### 🚨 Fraud Detection

Pattern recognition across claims history to flag suspicious activity.

- **Anomaly Detection** — Identifies duplicate claims, velocity patterns, network links
- **Risk Indicators** — Severity scoring (low/medium/high/critical) with confidence levels
- **Investigation Panels** — Related claims, evidence timeline, policy violations
- **Alert Management** — Track, escalate, resolve fraud cases with full workflow

---

### 📋 Compliance Auditing

Automated regulatory compliance checking with detailed reports.

- **Rule Engine** — 9 categories (data privacy, security, coverage, disclosure, etc.)
- **Issue Tracking** — Severity levels, remediation steps, resolution workflow
- **Report Generation** — Executive summaries, compliance scores, AI recommendations
- **Continuous Monitoring** — Real-time compliance issue detection

---

### 📄 Document Intelligence Pipeline

Enterprise-grade document processing with semantic understanding.

```
Upload → Parse → Chunk → Embed → Index → Query
  │        │        │        │        │
 PDF    Extract   Semantic  Vector   Milvus
 DOCX   clauses,  chunking  encode   HNSW
 TXT    headers   (512 tok) (OpenAI) index
```

| Capability             | Details                                   |
| ---------------------- | ----------------------------------------- |
| 📁 Multi-format        | PDF, DOCX, TXT (50MB max)                 |
| 🏗️ Layout preservation | Tables, headers, clause numbering         |
| ✂️ Semantic chunking   | Section-aware splitting, 50-token overlap |
| 📡 Real-time status    | Processing → Indexed → Ready              |

---

## 🧪 Tech Stack

| Category           | Technologies                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **Frontend**       | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Recharts    |
| **Backend**        | FastAPI, Python 3.11+, SQLAlchemy, Pydantic v2, Celery                                          |
| **AI/ML**          | LlamaIndex, LangGraph, LiteLLM, OpenAI Embeddings, Cross-Encoder Reranking (bge-reranker-v2-m3) |
| **Databases**      | PostgreSQL 16, Milvus 2.3, Redis 7                                                              |
| **Storage**        | MinIO (S3-compatible)                                                                           |
| **Auth**           | Keycloak (OIDC/OAuth2)                                                                          |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions                                                          |
| **Testing**        | pytest, pytest-asyncio, Playwright (55+ tests, 100% passing)                                    |

---

## 🔄 How It Works

### 1️⃣ Document Ingestion

```python
# Upload triggers async Celery pipeline
POST /api/v1/documents/upload
→ Validate file (PDF/DOCX/TXT, 50MB max)
→ Store in MinIO
→ Enqueue ingestion job
→ Return job_id for tracking
```

### 2️⃣ Processing Pipeline

```python
# Celery worker processes document asynchronously
def ingest_document(job_id):
    doc = parse(file)           # PyMuPDF / python-docx
    chunks = chunk(doc)         # Semantic chunking (512 tokens, 50 overlap)
    embeddings = embed(chunks)  # text-embedding-3-small
    index(embeddings)           # Milvus HNSW index
    update_status("indexed")    # Real-time status updates
```

### 3️⃣ Hybrid Retrieval

```python
# Query-time retrieval with multiple strategies
def retrieve(query, document_ids=None):
    dense = milvus.search(embed(query))      # Semantic similarity
    sparse = bm25.search(query)              # Keyword matching
    merged = reciprocal_rank_fusion(dense, sparse)
    return cross_encoder_rerank(merged)      # bge-reranker-v2-m3
```

### 4️⃣ Grounded Response Generation

```python
# LLM synthesis with mandatory citations
def generate(query, context_chunks):
    prompt = f"""
    Answer using ONLY the provided context.
    Cite sources as [document_name, page_number].
    If information is not in context, say so.

    Context: {context_chunks}
    Question: {query}
    """
    return llm.stream(prompt)  # SSE streaming
```

---

## 🖥️ Demo & Screenshots

<div align="center">

### Policy Chat Interface

<img src="docs/assets/chat-interface.png" alt="Chat Interface" width="90%"/>

_Natural language queries with streaming responses, source citations, and integrated PDF viewer_

---

### Claims Validation Dashboard

<img src="docs/assets/claims-dashboard.png" alt="Claims Dashboard" width="90%"/>

_AI-powered risk assessment with decision support (approve/reject/escalate) and audit logging_

---

### Fraud Detection Alerts

<img src="docs/assets/fraud-alerts.png" alt="Fraud Detection" width="90%"/>

_Pattern detection with investigation panels, related claims analysis, and case management_

---

### Compliance Reporting

<img src="docs/assets/compliance-report.png" alt="Compliance" width="90%"/>

_Automated compliance audits with severity tracking and AI-generated remediation steps_

</div>

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose v2+
- Node.js 20+ (for frontend development)
- Python 3.11+ (for backend development)
- OpenAI API key (or Anthropic/other LLM provider)

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/insurai.git
cd insurai

# 2. Copy environment template
cp .env.example .env

# 3. Add your API keys to .env
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# 4. Start all services
docker-compose up -d

# 5. Services will be available at:
# ┌──────────────┬─────────────────────────┐
# │ Frontend     │ http://localhost:3000   │
# │ Backend API  │ http://localhost:8000   │
# │ API Docs     │ http://localhost:8000/docs │
# │ Keycloak     │ http://localhost:8080   │
# │ MinIO        │ http://localhost:9001   │
# └──────────────┴─────────────────────────┘
```

### Development Setup

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Run tests
cd backend && pytest tests/ -v          # 55 tests, 100% passing
cd frontend && npx playwright test      # E2E tests
```

### Environment Variables

```env
# === LLM Configuration ===
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o  # or claude-3-opus

# === Database ===
DATABASE_URL=postgresql://insurai:insurai@localhost:5432/insurai
REDIS_URL=redis://localhost:6379

# === Vector Store ===
MILVUS_HOST=localhost
MILVUS_PORT=19530

# === Object Storage ===
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=insurai-documents

# === Auth ===
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=insurai
KEYCLOAK_CLIENT_ID=insurai-app
```

---

## 📡 API Overview

### Core Endpoints

| Method | Endpoint                   | Description                           |
| ------ | -------------------------- | ------------------------------------- |
| `POST` | `/api/v1/documents/upload` | Upload policy document (PDF/DOCX/TXT) |
| `GET`  | `/api/v1/documents`        | List workspace documents with status  |
| `POST` | `/api/v1/chat`             | Query policies (blocking response)    |
| `POST` | `/api/v1/chat/stream`      | Query policies (SSE streaming)        |
| `POST` | `/api/v1/retrieve`         | Retrieve relevant chunks only         |

### Domain APIs

| Method | Endpoint                    | Description                                  |
| ------ | --------------------------- | -------------------------------------------- |
| `POST` | `/api/v1/claims/validate`   | Validate claim against policy (FR013-14)     |
| `GET`  | `/api/v1/fraud/alerts`      | List fraud alerts with pagination (FR016-18) |
| `GET`  | `/api/v1/compliance/issues` | List compliance issues (FR019)               |
| `GET`  | `/api/v1/compliance/report` | Generate compliance report (FR020)           |
| `GET`  | `/api/v1/audit`             | Query audit logs (FR021)                     |
| `GET`  | `/api/v1/audit/analytics`   | Audit analytics dashboard                    |

### Infrastructure APIs

| Method                | Endpoint                 | Description                                      |
| --------------------- | ------------------------ | ------------------------------------------------ |
| `GET`                 | `/health`                | Service health check                             |
| `GET`                 | `/api/v1/metrics`        | Performance metrics (FR030)                      |
| `GET`                 | `/api/v1/metrics/health` | System health status (healthy/degraded/critical) |
| `GET`                 | `/api/v1/errors`         | Error logs (FR029)                               |
| `GET/POST/PUT/DELETE` | `/api/v1/workspaces`     | Multi-tenant workspace management (FR024)        |

### Interactive API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 🧠 AI & RAG Pipeline

### Hybrid Retrieval Architecture

InsurAI combines multiple retrieval strategies for maximum accuracy:

```
                      Query
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
      Dense Search              Sparse Search
      (Milvus/HNSW)                (BM25)
           │                         │
           └────────────┬────────────┘
                        ▼
             Reciprocal Rank Fusion
                        │
                        ▼
              Cross-Encoder Reranking
              (bge-reranker-v2-m3)
                        │
                        ▼
                 Top-K Contexts
                        │
                        ▼
              Grounded LLM Response
              (with citations)
```

### Why Hybrid Retrieval?

| Query Type                        | Dense Only        | Sparse Only    | Hybrid ✅       |
| --------------------------------- | ----------------- | -------------- | --------------- |
| "What does clause 7.2 say?"       | ❌ Misses exact   | ✅ Finds exact | ✅              |
| "Am I covered for water damage?"  | ✅ Semantic match | ❌ No keywords | ✅              |
| "Deductible for fire claims"      | ✅                | ✅             | ✅ Best of both |
| "Similar coverage to my neighbor" | ✅                | ❌             | ✅              |

### Grounded Generation

All responses are anchored in retrieved context:

- **System prompt** enforces citation requirements
- **Citation format**: `[document_name, page_number]`
- **Confidence indicators** flag low-context responses
- **Source panel** with clickable references + PDF viewer

---

## 🔐 Security & Compliance

### Role-Based Access Control (8 Roles)

| Role                   | Permissions                                          |
| ---------------------- | ---------------------------------------------------- |
| **Customer**           | View own policies, submit claims                     |
| **Broker**             | Upload documents, assist customers                   |
| **Underwriter**        | Risk assessment, policy analysis, premium adjustment |
| **Claims Adjuster**    | Validate claims, approve/reject/escalate             |
| **Fraud Analyst**      | Fraud alerts, investigation tools                    |
| **Compliance Officer** | Compliance review, regulatory reports                |
| **Auditor**            | Full read access, audit exports                      |
| **Admin**              | Full system access, user management                  |

### Security Features

| Feature                    | Implementation                                     |
| -------------------------- | -------------------------------------------------- |
| 🔑 **Identity Management** | Keycloak OIDC with JWT validation                  |
| 🏢 **Multi-Tenancy**       | Workspace isolation per organization (FR024)       |
| 📝 **Audit Logging**       | All actions tracked with timestamps (FR021, FR028) |
| 🛡️ **Route Guards**        | Frontend + backend authorization checks            |
| 🔒 **Data Protection**     | PII masking, TLS encryption                        |
| 📊 **Error Monitoring**    | Centralized error tracking (FR029)                 |

---

## 📊 Use Cases

### 👔 For Underwriters

> _"Analyze risk factors across 500 policies in minutes instead of weeks"_

- Upload and index entire policy portfolios
- Natural language risk queries with source citations
- AI-powered premium adjustment recommendations
- Override decisions with full audit trail

### ⚖️ For Claims Adjusters

> _"Validate claims against policy clauses with AI-powered decision support"_

- Instant coverage verification with confidence scores
- Fraud indicator alerts during validation
- Approve/reject/escalate workflow
- Full audit logging of decisions and overrides

### 📋 For Compliance Officers

> _"Continuous compliance monitoring with automated issue detection"_

- Real-time rule violation detection (9 categories)
- Severity-based prioritization (low → critical)
- AI-generated remediation recommendations
- Executive summary reports with compliance scores

### 🏢 For Insurance Carriers

> _"Scale operations without scaling headcount"_

| Metric             | Improvement                 |
| ------------------ | --------------------------- |
| Policy Review Time | **80% reduction**           |
| Claims Processing  | **60% faster**              |
| Fraud Detection    | **Proactive, not reactive** |
| Compliance Costs   | **Automated monitoring**    |

---

## 📈 Future Roadmap

### 🔜 Near-term

- [ ] Multi-language policy support (Spanish, French, German)
- [ ] Advanced LangGraph agent workflows
- [ ] PDF annotation with in-document highlighting
- [ ] Mobile-responsive dashboard optimization

### 🔮 Mid-term

- [ ] Custom embedding model fine-tuning on insurance corpus
- [ ] Predictive claims analytics with ML models
- [ ] Integration APIs (Guidewire, Duck Creek, Salesforce)
- [ ] Batch document processing for bulk uploads

### 🚀 Long-term

- [ ] On-premise deployment option (air-gapped)
- [ ] Federated learning for cross-org insights
- [ ] Real-time policy amendment detection
- [ ] Voice-enabled policy queries

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

```bash
# 1. Fork the repository

# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Make your changes and add tests

# 4. Commit with conventional commits
git commit -m 'feat: add amazing feature'

# 5. Push to your branch
git push origin feature/amazing-feature

# 6. Open a Pull Request
```

### Development Guidelines

- Follow existing code style (Ruff for Python, ESLint/Prettier for TypeScript)
- Add tests for new features (pytest for backend, Playwright for E2E)
- Update documentation as needed
- Keep PRs focused and atomic

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

## 🏆 Built With Production-Grade Engineering

**InsurAI** demonstrates enterprise implementation of:

`Hybrid RAG` • `Agentic AI` • `Microservices` • `Vector Databases` • `Real-time Streaming` • `Multi-tenancy`

---

### Tech Highlights

| Area            | Details                                                        |
| --------------- | -------------------------------------------------------------- |
| **Backend**     | 11 routers, 41+ endpoints, 9 models, 2 middleware layers       |
| **Testing**     | 55 tests, 100% passing, comprehensive coverage                 |
| **AI Pipeline** | Hybrid retrieval, cross-encoder reranking, grounded generation |
| **Security**    | RBAC, workspace isolation, full audit trails                   |

---

[🐛 Report Bug](https://github.com/yourusername/insurai/issues) • [✨ Request Feature](https://github.com/yourusername/insurai/issues) • [📚 Documentation](docs/)

---

**Made with ❤️ for the future of insurance automation**

</div>
