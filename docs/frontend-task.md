# Frontend Task Tracker

## ✅ Completed Tasks

### Policy Document Management

- **FR001 – Upload Policy Documents**: UploadPanel with drag-and-drop, file picker, PDF/DOCX support, XHR upload with real progress bar (`UploadPanel.tsx`, `lib/api.ts`)
- **FR006 – Document Status Tracking**: DocumentTable displays status badges (uploading, processing, indexed, error) with auto-polling every 8s for in-flight documents (`DocumentTable.tsx`)

### AI Policy Query System

- **FR007 – AI Policy Chat**: ChatPanel with message history, natural language input, suggestion chips, and real SSE streaming via `fetch().body.getReader()` (`ChatPanel.tsx`, `lib/api.ts`)
- **FR009 – Contextual AI Answers**: Streaming AI responses rendered progressively with loading indicators (`ChatPanel.tsx`)
- **FR010 – Source Citation**: SourcePanel displays citations with document ID, page number, relevance score, and text snippet preview (`SourcePanel.tsx`)
- **Source Panel Dual-Pane PDF Viewer**: Clickable source citations open a fullscreen PDF viewer with page navigation (prev/next, jump to page), zoom controls (50%-200%), highlighted chunk banner showing retrieved text with relevance score, loading/error states, and dynamic component loading via Next.js — implements the "PDF Source Viewer (highlighting retrieved chunks)" architecture (`components/PDFViewer.tsx`, `components/SourcePanel.tsx`, `components/ChatPageClient.tsx`)
- **FR011 – Multi-Document Query**: DocumentSelector component allows users to select which documents to search across, with collapsible panel showing document list, multi-select checkboxes, Select All/Clear All buttons, document status badges, and auto-selection of indexed documents — API functions updated to pass document_ids filter to chat endpoints (`components/DocumentSelector.tsx`, `components/ChatPanel.tsx`, `components/ChatPageClient.tsx`, `lib/api.ts`)

### Claims Validation

- **FR013 – Claim Policy Validation**: Claims page displays validation results with status (approved/denied/pending), risk score, and referenced clauses — **now fully wired to `POST /api/v1/claims/validate` API** (`app/claims/page.tsx`, `lib/api.ts`)
- **FR014 – Coverage Explanation**: AI-generated reasoning with referenced policy clauses and section references shown alongside validation results (`app/claims/page.tsx`)
- **FR012 – Submit Claim Details**: Claims form with complete input fields (claim ID, policy number, type, date, amount, description) **and document attachment capability** — users can attach supporting documents (receipts, photos, reports) with inline upload, progress tracking, and multi-file support (`app/claims/page.tsx`, `components/ClaimDocumentUpload.tsx`)

### Fraud Detection

- **FR016 – Fraud Pattern Detection**: Fraud page displays alerts with risk scores, severity levels, anomaly types, and color-coded badges — **now fully wired to `GET /api/v1/fraud/alerts` API** (`app/fraud/page.tsx`, `lib/api.ts`)
- **FR017 – Fraud Alert Generation**: Fraud alerts with alert ID, claim ID, type, risk score, severity, date, status, and view/dismiss actions (`app/fraud/page.tsx`)
- **FR018 – Fraud Investigation Support**: Comprehensive investigation panel with tabbed interface (Evidence/Related Claims/Policy Clauses), structured fraud indicators, related claims cross-reference with similarity scores, policy clause mapping with violation detection, investigation timeline, and action buttons (Resolve/Dismiss/Escalate) — displayed in fullscreen modal when viewing an alert (`app/fraud/page.tsx`, `components/FraudInvestigationPanel.tsx`)

### Compliance

- **FR019 – Compliance Review**: Compliance page lists issues with severity, rule name, description, and status (open/acknowledged/resolved) — **now fully wired to `GET /api/v1/compliance/issues` API** (`app/compliance/page.tsx`, `lib/api.ts`)
- **FR020 – Compliance Report Generation**: Structured compliance audit reports with executive summary (compliance score, issues by status), breakdown by severity, detailed issue cards, and AI-generated recommendations — displayed in fullscreen modal after clicking "Generate Report" (`app/compliance/page.tsx`, `components/ComplianceReport.tsx`)

### User Management

- **FR022 – User Authentication**: Login page with email/password form, validation, error handling, and SSO buttons; Signup page with password strength indicator (`app/login/page.tsx`, `app/signup/page.tsx`)

### Analytics

- **FR025 – Policy Analytics Dashboard**: Dashboard with stats cards (Documents Indexed, AI Queries, Claims Processed, Fraud Alerts), trend percentages, and quick-action links (`app/dashboard/`)
- **FR027 – Risk Trends Visualization**: Time-series charts showing claim trends (30-day line chart), risk patterns by claim type (bar chart), and anomaly detection (scatter plot) with insights summary metrics (`components/RiskTrendsCharts.tsx`, `app/dashboard/DashboardClient.tsx`, Recharts library)

### Infrastructure & UX

- **Role-based dashboard routing**: Separate views at `/dashboard/underwriter` and `/dashboard/compliance` with role-specific content
- **Onboarding flow**: 3-step onboarding with role selection (4 roles), workspace setup, and optional policy upload (`OnboardingFlow.tsx`, `OnboardingProgress.tsx`)
- **Document management page**: List view with status tracking, auto-refresh polling, error/empty states (`app/documents/page.tsx`)
- **Settings page**: Profile editing (name, email, role, company/workspace), security badges, sign-out (`app/settings/page.tsx`)
- **Responsive design**: Tailwind breakpoints throughout (mobile-first, single-column stacking to multi-column on desktop)
- **Accessibility**: aria labels, aria-required, aria-invalid, aria-describedby, keyboard navigation, `eslint-plugin-jsx-a11y` installed
- **E2E test suite**: Comprehensive Playwright tests covering onboarding, chat, documents, accessibility, and responsive layout (`tests/ui.spec.ts`)
- **Real API integration**: `lib/api.ts` with endpoints for streaming chat, blocking chat, document list, and file upload with progress
- **React Error Boundary**: App-wide error catching with `ErrorBoundary.tsx` class component wrapping root layout via `ClientLayoutWrapper.tsx`, displays user-friendly fallback UI with `ErrorFallback.tsx`, prevents component crashes from killing entire app — includes dev/prod error details toggle, "Try Again" recovery button, and support contact link
- **Role-Based Access Control (FR023)**: Navigation links filtered by role permissions (`lib/rbac.ts`), route-level guards prevent unauthorized access with redirect and "Access Denied" UI (`components/RoleGuard.tsx`), 8 roles supported with centralized permission matrix
- **State management architecture**: Zustand for global state (`lib/store.ts` with auth, user, workspace state persisted to localStorage), TanStack Query for server state (`components/QueryProvider.tsx`, `hooks/useQueries.ts`) with automatic caching, background refetching, and request deduplication — fraud and compliance pages migrated from manual `useEffect` + `fetch` to declarative query hooks

---

## 🚧 In Progress

> No tasks currently in progress. FR027 completed. Next priority: FR026 (Query Analytics) or FR015 (Risk Assessment)

---

## ❌ Remaining Tasks

> Ordered by: core functionality → user flow blocking → demo readiness

1. **FR026 – Query Analytics**: Only a single "AI Queries Today" metric on the dashboard — no query log table, no usage pattern charts, no historical analytics view — _admin oversight capability missing_
2. **FR015 – Risk Assessment**: No dedicated underwriter risk assessment tool; all underwriter dashboard actions route to `/chat` instead of a standalone risk evaluation interface — _underwriter persona has no specialized workflow_
3. **FR021 – Audit Policy History**: No audit trail UI showing history of policy modifications, claims decisions, or user activity logs — _compliance/audit persona cannot review historical actions_

---

## 🔥 High Priority

> Ordered by: core functionality → user flow blocking → demo readiness

1. **Real authentication backend**: Login/signup forms exist but auth state is managed entirely via localStorage — no Keycloak/JWT/OIDC integration for production-grade identity management — _blocks real multi-user sessions and token-based API access_

---

## 🧠 Improvements

> Ordered by: core functionality → user flow blocking → demo readiness

1. **Replace localStorage auth with Keycloak/JWT**: Integrate OIDC login flow, token refresh, and session management per the security architecture — _prerequisite for multi-user production use_
2. **Add PDF viewer with chunk highlighting**: Integrate `react-pdf` or `@react-pdf-viewer/core` in the SourcePanel to render actual policy PDFs with highlighted retrieved sections — _high demo impact; visually demonstrates RAG grounding_
3. **Install and adopt TanStack Query**: Replace manual `useEffect` + `fetch` patterns in DocumentTable and dashboard with proper caching, background refetching, and optimistic updates — _reduces data-fetching bugs and improves perceived speed_
4. **Install and adopt Zustand**: Centralize auth state, user preferences, active workspace, and chat session state instead of prop-drilling and scattered `useState` — _prevents state fragmentation as features grow_
5. **Add toast notification system**: Install `sonner` or `react-hot-toast` for consistent success/error feedback across uploads, report generation, and form submissions — _polishes user feedback for demos_
6. **Build dedicated risk assessment tool**: Create a standalone underwriter interface for evaluating policy/claim risk with structured inputs and AI-generated risk reports — _completes underwriter persona workflow_
7. **Add query analytics dashboard page**: Build a dedicated `/analytics` route with query log table, usage-over-time charts (e.g., Recharts), and filter controls — _completes admin persona workflow_
8. **Add audit trail page**: Build a `/audit` route displaying timestamped logs of policy uploads, modifications, claims decisions, and user actions — _completes auditor persona workflow_
9. **Add loading skeletons**: Replace spinner-only loading states with content-shaped skeleton placeholders for better perceived performance — _UX polish for final release_
