# Frontend Task Tracker

## ✅ Completed Tasks

### Policy Document Management

- **FR001 – Upload Policy Documents**: UploadPanel with drag-and-drop, file picker, PDF/DOCX support, XHR upload with real progress bar (`UploadPanel.tsx`, `lib/api.ts`)
- **FR006 – Document Status Tracking**: DocumentTable displays status badges (uploading, processing, indexed, error) with auto-polling every 8s for in-flight documents (`DocumentTable.tsx`)

### AI Policy Query System

- **FR007 – AI Policy Chat**: ChatPanel with message history, natural language input, suggestion chips, and real SSE streaming via `fetch().body.getReader()` (`ChatPanel.tsx`, `lib/api.ts`)
- **FR009 – Contextual AI Answers**: Streaming AI responses rendered progressively with loading indicators (`ChatPanel.tsx`)
- **FR010 – Source Citation**: SourcePanel displays citations with document ID, page number, relevance score, and text snippet preview (`SourcePanel.tsx`)

### Claims Validation

- **FR013 – Claim Policy Validation**: Claims page displays validation results with status (approved/denied/pending), risk score, and referenced clauses — **now fully wired to `POST /api/v1/claims/validate` API** (`app/claims/page.tsx`, `lib/api.ts`)
- **FR014 – Coverage Explanation**: AI-generated reasoning with referenced policy clauses and section references shown alongside validation results (`app/claims/page.tsx`)

### Fraud Detection

- **FR016 – Fraud Pattern Detection**: Fraud page displays alerts with risk scores, severity levels, anomaly types, and color-coded badges — **now fully wired to `GET /api/v1/fraud/alerts` API** (`app/fraud/page.tsx`, `lib/api.ts`)
- **FR017 – Fraud Alert Generation**: Fraud alerts with alert ID, claim ID, type, risk score, severity, date, status, and view/dismiss actions (`app/fraud/page.tsx`)

### Compliance

- **FR019 – Compliance Review**: Compliance page lists issues with severity, rule name, description, and status (open/acknowledged/resolved) — **now fully wired to `GET /api/v1/compliance/issues` API** (`app/compliance/page.tsx`, `lib/api.ts`)

### User Management

- **FR022 – User Authentication**: Login page with email/password form, validation, error handling, and SSO buttons; Signup page with password strength indicator (`app/login/page.tsx`, `app/signup/page.tsx`)

### Analytics

- **FR025 – Policy Analytics Dashboard**: Dashboard with stats cards (Documents Indexed, AI Queries, Claims Processed, Fraud Alerts), trend percentages, and quick-action links (`app/dashboard/`)

### Infrastructure & UX

- **Role-based dashboard routing**: Separate views at `/dashboard/underwriter` and `/dashboard/compliance` with role-specific content
- **Onboarding flow**: 3-step onboarding with role selection (4 roles), workspace setup, and optional policy upload (`OnboardingFlow.tsx`, `OnboardingProgress.tsx`)
- **Document management page**: List view with status tracking, auto-refresh polling, error/empty states (`app/documents/page.tsx`)
- **Settings page**: Profile editing (name, email, role, company/workspace), security badges, sign-out (`app/settings/page.tsx`)
- **Responsive design**: Tailwind breakpoints throughout (mobile-first, single-column stacking to multi-column on desktop)
- **Accessibility**: aria labels, aria-required, aria-invalid, aria-describedby, keyboard navigation, `eslint-plugin-jsx-a11y` installed
- **E2E test suite**: Comprehensive Playwright tests covering onboarding, chat, documents, accessibility, and responsive layout (`tests/ui.spec.ts`)
- **Real API integration**: `lib/api.ts` with endpoints for streaming chat, blocking chat, document list, and file upload with progress

---

## 🚧 In Progress

> Ordered by: core functionality → user flow blocking → demo readiness

1. **FR012 – Submit Claim Details**: Claim form has input fields (claim ID, policy number, type, date, amount, description) but is **missing document attachment/upload** for supporting evidence — *blocks the complete claims submission flow*
2. **Source panel dual-pane**: Chat page has left/right pane layout with text citations, but **no PDF viewer component** with highlighted retrieved chunks (architecture requires embedded PDF highlighting) — *core RAG differentiator for demos*
3. **FR020 – Compliance Report Generation**: "Generate Report" button exists but only displays a toast with a filename — **no actual structured report** with summarized issues and recommendations is rendered — *compliance workflow dead-ends without viewable output*
4. **FR018 – Fraud Investigation Support**: Alert detail panel shows evidence summary text but **lacks structured evidence display** (no related claims cross-reference, no policy clause mapping) — *fraud alerts functional but investigation depth incomplete*

---

## ❌ Remaining Tasks

> Ordered by: core functionality → user flow blocking → demo readiness

1. **FR023 – Role-Based Access Control**: Roles are displayed in Navbar but **not enforced** — all 6 nav links visible to all users, no route guards restrict access by role — *security fundamental; every user sees admin-level navigation*
2. **FR011 – Multi-Document Query**: No frontend UI for selecting or filtering across multiple documents before querying — *core RAG capability; users cannot scope queries across specific policy sets*
3. **FR027 – Risk Trends Visualization**: No time-series charts or graphs showing claim trends, risk patterns, or anomaly visualization — only static stat cards exist — *dashboard lacks visual depth for demos*
4. **FR026 – Query Analytics**: Only a single "AI Queries Today" metric on the dashboard — no query log table, no usage pattern charts, no historical analytics view — *admin oversight capability missing*
5. **FR015 – Risk Assessment**: No dedicated underwriter risk assessment tool; all underwriter dashboard actions route to `/chat` instead of a standalone risk evaluation interface — *underwriter persona has no specialized workflow*
6. **FR021 – Audit Policy History**: No audit trail UI showing history of policy modifications, claims decisions, or user activity logs — *compliance/audit persona cannot review historical actions*

---

## 🔥 High Priority

> Ordered by: core functionality → user flow blocking → demo readiness

1. **Role-Based Access Control enforcement (FR023)**: All routes are accessible to all authenticated users regardless of role — Navbar, route guards, and feature visibility must be gated by role — *security-critical; undermines multi-persona architecture*
3. **Real authentication backend**: Login/signup forms exist but auth state is managed entirely via localStorage — no Keycloak/JWT/OIDC integration for production-grade identity management — *blocks real multi-user sessions and token-based API access*
4. **React Error Boundary**: No Error Boundary component exists — unhandled component errors crash the entire app instead of showing a fallback UI — *any runtime error kills the user session*
5. **State management architecture**: App uses only React `useState` — Zustand (global state) and React Query / TanStack Query (server state, caching, refetching) are specified in the architecture but not installed or used — *increasing complexity will cause prop-drilling and stale data bugs*

---

## 🧠 Improvements

> Ordered by: core functionality → user flow blocking → demo readiness

1. **Replace localStorage auth with Keycloak/JWT**: Integrate OIDC login flow, token refresh, and session management per the security architecture — *prerequisite for multi-user production use*
3. **Add PDF viewer with chunk highlighting**: Integrate `react-pdf` or `@react-pdf-viewer/core` in the SourcePanel to render actual policy PDFs with highlighted retrieved sections — *high demo impact; visually demonstrates RAG grounding*
4. **Install and adopt TanStack Query**: Replace manual `useEffect` + `fetch` patterns in DocumentTable and dashboard with proper caching, background refetching, and optimistic updates — *reduces data-fetching bugs and improves perceived speed*
5. **Install and adopt Zustand**: Centralize auth state, user preferences, active workspace, and chat session state instead of prop-drilling and scattered `useState` — *prevents state fragmentation as features grow*
6. **Add toast notification system**: Install `sonner` or `react-hot-toast` for consistent success/error feedback across uploads, report generation, and form submissions — *polishes user feedback for demos*
7. **Build dedicated risk assessment tool**: Create a standalone underwriter interface for evaluating policy/claim risk with structured inputs and AI-generated risk reports — *completes underwriter persona workflow*
8. **Add query analytics dashboard page**: Build a dedicated `/analytics` route with query log table, usage-over-time charts (e.g., Recharts), and filter controls — *completes admin persona workflow*
9. **Add audit trail page**: Build a `/audit` route displaying timestamped logs of policy uploads, modifications, claims decisions, and user actions — *completes auditor persona workflow*
10. **Add loading skeletons**: Replace spinner-only loading states with content-shaped skeleton placeholders for better perceived performance — *UX polish for final release*
