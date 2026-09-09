# Project Memory (`agy-memory.md`)

This living document tracks project context, architectural decisions, tooling rules, and progress from day one. It must be maintained and updated as work continues.

---

## 1. Project Overview

* **Project Name**: AI-Powered Ticket Management System (Helpdesk)
* **Goal**: An autonomous AI helpdesk system that ingests student support emails, classifies intent, retrieves relevant knowledge base documentation (RAG), and autonomously sends human-friendly email replies without requiring human review.
* **Core Operating Mode**:
  * **Autonomous First**: AI automatically sends replies directly to students for general and technical inquiries.
  * **Human Fallback / Escalation**: Sensitive workflows (e.g., refund requests, low confidence, angry sentiments) are flagged and routed to human agents/admins.

---

## 2. Ratified Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Runtime & Package Manager** | **Bun** (v1.4+) | Fast package installation, workspaces, native TypeScript execution. |
| **Frontend** | **React 19 + Vite + TypeScript** | Client SPA in `/client`, proxying `/api` requests to backend on port 5000. |
| **Styling** | **Tailwind CSS v4** | Modern zero-config setup using `@tailwindcss/vite` and `@import "tailwindcss";`. |
| **UI Components** | **shadcn/ui** | Accessible components with Base UI primitives, Lucide icons, Geist font, and default `neutral` theme using CSS variables. |
| **Client Routing** | **React Router (v7+)** | Client-side routing for dashboard and ticket views. |
| **Server State / Data Fetching** | **TanStack Query (v5)** | Asynchronous state management, intelligent caching, retry rules, and background synchronization. |
| **HTTP Client** | **Axios (v1.x)** | Centralized client with session credential support and type-safe error handling. |
| **Backend** | **Node.js + Express + TypeScript** | REST API in `/server`, executed via `bun --watch src/index.ts`. |
| **Authentication** | **Database Sessions** | **Better Auth** (email/password, database sessions via Prisma adapter backed by PostgreSQL). |
| **Database** | **PostgreSQL 18** | Local PostgreSQL on port 5433 (`helpdesk` database). |
| **ORM** | **Prisma ORM (v7+)** | Type-safe queries with driver adapters (`@prisma/adapter-pg`) and declarative migrations (`prisma.config.ts` & `prisma/schema.prisma`). |
| **AI / LLM** | **Vercel AI SDK (`ai`, `@ai-sdk/openai`) & Google Gemini (`@google/genai`)** | Unified AI SDK for text generation with OpenAI (`gpt-5.6-luna`), reply polishing, conversation summarization, and autonomous replies. |
| **Component Testing** | **React Testing Library + Vitest** | UI component tests with `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom`. |
| **E2E Testing** | **Playwright** | End-to-end user journeys against isolated PostgreSQL test database (`helpdesk_test`). |
| **Email Inbound/Outbound** | **SendGrid / Mailgun** | Inbound via webhooks, outbound via email API with email threading headers. |

---

## 3. Documentation Tooling (Context7 MCP)

**Context7** is configured as an MCP server to provide real-time, accurate documentation for all libraries and frameworks used in this project.

### Protocol for Agent:
Whenever dealing with libraries, APIs, SDKs, or versions (e.g., `@google/genai`, `prisma`, `express-session`, `tailwindcss` v4, React 19):
1. **Resolve Library ID**: Call `resolve-library-id` with the library name.
2. **Query Docs**: Call `query-docs` with the resolved ID to retrieve current API syntax, breaking changes, and configuration best practices before writing implementation code.

---

## 4. Working Principles & User Preferences

* **No Premature Code / No Mock Fluff**: Do not introduce unnecessary example data, fake tables, or premature abstraction files. Keep files and implementations strictly focused on what the user asks for.
* **Incremental Development**: Build phase-by-phase according to `implementation-plan.md`.
* **Runtime**: Always use `bun` commands (`bun install`, `bun dev`, `bun run ...`) rather than `npm` or `node`.
* **Client Data Fetching (Axios & TanStack Query)**: Always use the preconfigured **Axios** client (`client/src/lib/api.ts`) and **TanStack Query** (`useQuery`, `useMutation`) for client-side API requests and server-state management. Never use raw `window.fetch()` for backend API calls.
* **Component & Unit Testing — Primary Choice (React Testing Library + Vitest + Bun Test)**: Rely primarily on component and unit tests for the vast majority of the testing suite. UI behavior, component rendering, user interactions, search/filtering, sorting, pagination, form validation errors, password toggle buttons, modal state transitions, and badge styling should all be covered at the component level using React Testing Library (`@testing-library/react`), `@testing-library/jest-dom/vitest`, and the custom `renderWithQuery` wrapper ([`client/src/test/renderWithQuery.tsx`](client/src/test/renderWithQuery.tsx)). All backend business logic, validation schemas, and database service queries should be covered with fast unit tests in Bun (`bun test`). Ensure mock isolation via `vi.resetAllMocks()` and `vi.restoreAllMocks()` in `beforeEach`.
* **E2E Testing — Strictly Exclude Unit-Tested Logic (Playwright Anti-Duplication Rule)**: Never author or maintain Playwright E2E tests for functionality already covered by unit or component tests. Keep ONLY those E2E tests that are absolutely necessary to test behavior that cannot be tested with unit tests:
  1. Real browser Better Auth session cookie establishment, HttpOnly cookie security, and session persistence across full browser reloads (`page.reload()`).
  2. Real browser sign out destroying cookies and blocking subsequent page navigation.
  3. Real browser Role-Based Access Control (RBAC) route guards (verifying `ADMIN` sees and accesses `/users`, while `AGENT` has links hidden and is redirected).
  4. True cross-boundary asynchronous integration workflows (e.g., external email webhook creates ticket in PostgreSQL -> Agent reviews in UI -> Agent replies in browser -> Customer sends follow-up email via webhook -> conversation thread displays both replies and persists).
  All form validation, modal open/close permutations, table sorting/filtering UI, search debouncing, button disabled states, and isolated API CRUD operations must be tested strictly via unit tests. For all E2E testing tasks, delegate to or invoke the dedicated `playwright-e2e` subagent (`.agents/agents/playwright-e2e/agent.md`), strictly respecting test database isolation (`helpdesk_test`).
* **DRY Principle & Function Reusability (Strict Requirement)**: Never duplicate the same logic, schemas, field markup, queries, or utility helpers twice. Instead, use a function, custom hook, base schema, or reusable subcomponent and follow the DRY principle. Keep a single source of truth for all repeated behavior across the entire codebase.
* **Memory Maintenance**: Keep this file (`agy-memory.md`) updated with all key milestones, architectural shifts, and completed tasks.

---

## 5. Key Conventions

### 5.1 Architecture & Code Structure
- **Decoupled Architecture**: `/client` (React SPA) and `/server` (Express REST API) reside in Bun workspaces.
- **Backend Flow**: `Route` $\rightarrow$ `Controller` $\rightarrow$ `Service` $\rightarrow$ `Prisma Client` (keep controllers thin, business logic in services).
- **No Premature Abstractions**: Only introduce utility files, types, or services when actively required by the current task.

### 5.2 Naming Conventions
| Item | Convention | Example |
|---|---|---|
| **React Components** | `PascalCase.tsx` | `TicketCard.tsx`, `App.tsx` |
| **Backend Files** (routes, controllers, services) | `kebab-case.ts` | `ticket.routes.ts`, `auth.controller.ts`, `gemini.service.ts` |
| **Functions & Variables** | `camelCase` | `getTickets()`, `customerEmail`, `isAutoResolved` |
| **TypeScript Types & Interfaces** | `PascalCase` | `TicketWithMessages`, `CreateTicketInput` |
| **Prisma Models** | `PascalCase` (singular) | `User`, `Ticket`, `Message`, `Category` |
| **Database Tables & Columns** | `snake_case` via `@@map` / `@map` | `@@map("tickets")`, `@map("created_at")` |
| **Enums & Constants** | `UPPER_SNAKE_CASE` | `OPEN`, `RESOLVED`, `ADMIN`, `AGENT` |

### 5.3 API & REST Standards
- **Prefix**: All API routes prefixed with `/api` (e.g., `/api/tickets`, `/api/auth/login`).
- **Plural Resources**: Use plural nouns for resource endpoints (`/api/tickets`, `/api/users`, `/api/kb`).
- **HTTP Methods**: `GET` (read), `POST` (create), `PATCH` (partial update), `PUT` (full replace), `DELETE` (remove).
- **HTTP Status Codes**:
  - `200 OK`: Successful read/update.
  - `201 Created`: Successful creation.
  - `400 Bad Request`: Validation failure.
  - `401 Unauthorized`: Missing or invalid session.
  - `403 Forbidden`: Authenticated, but insufficient role permissions.
  - `404 Not Found`: Resource does not exist.
  - `500 Internal Server Error`: Unhandled server exception.
- **Envelope Standard**: Consistent JSON responses (`{ success: true, data: ... }` or `{ success: false, error: "message" }`).

### 5.4 TypeScript & Validation
- **Strict Mode**: `strict: true` across all tsconfigs. Avoid `any`; use `unknown` or explicit types.
- **Input Validation**: Use **Zod** schemas for validating incoming request bodies and query parameters before passing data to services.
- **Error Handling**: Use Express centralized error middleware. Catch all asynchronous errors (no unhandled promise rejections).

### 5.5 AI (Google Gemini) Conventions
- **SDK**: Strictly use the unified `@google/genai` SDK.
- **Structured Outputs**: Use Gemini JSON schemas / structured outputs for ticket classification and priority scoring.
- **Grounding / Prompting**: Clearly isolate system instructions (rules, persona) from dynamic user inputs (email text) to prevent prompt injection.

### 5.6 Tooling & Commands
- Strictly run commands with **`bun`** (`bun install`, `bun dev:server`, `bun dev:client`).
- Query **Context7 MCP** for up-to-date documentation before adopting new APIs or libraries.

### 5.7 E2E Testing Instructions (`playwright-e2e` Subagent)
* **Dedicated Agent**: Delegate all E2E test creation, updates, execution, and debugging to the specialized `playwright-e2e` subagent ([`.agents/agents/playwright-e2e/agent.md`](.agents/agents/playwright-e2e/agent.md)).
* **Testing Scope & Philosophy (Use E2E Only When Strictly Necessary)**:
  - **Do NOT duplicate component tests in E2E**: Filtering variations, search input debouncing, dropdown open/close states, modal lifecycles, validation error messages, and badge color permutations belong strictly in component tests (`React Testing Library + Vitest`).
  - **Reserve E2E strictly for**:
    1. Critical happy-path user journeys (e.g. login -> session persistence across reloads -> dashboard).
    2. End-to-end cross-system integrations (e.g. inbound webhook -> PostgreSQL DB persistence -> verified on UI).
    3. Strict security/RBAC boundaries (e.g. non-admin navigation attempts to `/users` blocked and redirected).
* **Strict Database Isolation**:
  * All E2E tests must run against the dedicated test database `helpdesk_test` on PostgreSQL port `5433` (via backend port `5001` and frontend port `5174`).
  * **NEVER** run tests against or mutate the development database `helpdesk` (ports `5000` / `5173`).
* **Database Lifecycle Commands**:
  * `bun run db:test:setup`: Ensures `helpdesk_test` exists, applies pending Prisma migrations, and seeds test data.
  * `bun run db:test:reset`: Drops and recreates `helpdesk_test`, reapplies all migrations, and reseeds initial test data.
* **Pre-Seeded Test Credentials**:
  * **Admin User**: `test@example.com` / `uvdb1357` (Role: `ADMIN`).
  * **Agent User**: `agent@example.com` / `uvdb1357` (Role: `AGENT`).
* **Test Organization**:
  * Place tests strictly in `/e2e` grouped by feature domain (e.g., `e2e/auth/login.spec.ts`, `e2e/rbac/admin-routes.spec.ts`, `e2e/tickets/`).
* **Locator Guidelines**:
  * Target UI elements using accessible semantic roles (`getByRole`, `getByLabel`, `getByText`, `getByRole('alert')`) built on shadcn/ui and Base UI primitives.
  * Avoid brittle CSS selectors or generated Tailwind utility classes.
* **Execution Commands**:
  * `bun run test:e2e` (runs full test suite headlessly).
  * `bun run test:e2e:ui` (opens interactive Playwright UI).
  * `bun run test:e2e:headed` (runs tests with visible Chromium browser).
  * `bunx playwright test e2e/<file>.spec.ts` (runs a specific test file).
* **Rate Limiting**: Rate limiting is strictly scoped to `production` (`NODE_ENV === "production"`), ensuring test suites running under `NODE_ENV=test` never experience 429 request throttling.

### 5.8 Client Data Fetching & Server State (Axios & TanStack Query)
* **Centralized Axios Instance**:
  - Always import and use the preconfigured client from [`client/src/lib/api.ts`](client/src/lib/api.ts) (`import { api } from "@/lib/api"`).
  - Configured with `withCredentials: true` to automatically forward Better Auth session cookies with all requests.
  - **Never use native `window.fetch()`** for application API calls.
* **TanStack Query (React Query v5)**:
  - Use `useQuery` for read queries with structured `queryKey` arrays (e.g. `queryKey: ["users"]`, `queryKey: ["tickets", id]`).
  - Use `useMutation` for write/update/delete operations and invalidate associated query keys (`queryClient.invalidateQueries({ queryKey: [...] })`).
  - Do not manage asynchronous fetch state manually with `useState`/`useEffect` boilerplate; rely on TanStack Query for caching, automatic deduplication, and background synchronization.
* **Type-Safe Error Handling**:
  - Narrow caught errors using `axios.isAxiosError(err)` to access `err.response?.status` and backend error messages (`err.response?.data?.error`).
  - The shared `queryClient` (`client/src/lib/query-client.ts`) is configured to suppress automatic retries on `401 Unauthorized`, `403 Forbidden`, and `404 Not Found` errors.

### 5.9 Component & Unit Testing Guidelines (React Testing Library + Vitest)
* **Primary Testing Tier**:
  - Rely primarily on component tests for all UI logic, user interactions, search/filtering, tab switching, sorting, modal states, validation errors, and badge styling.
  - Component tests run fast in jsdom with zero network latency, giving deterministic and immediate regression protection.
* **Testing Stack & Environment**:
  - **Runner**: **Vitest** configured in [`client/vitest.config.ts`](client/vitest.config.ts) with `environment: "jsdom"`, `@vitejs/plugin-react`, and workspace package deduplication.
  - **DOM & Assertions**: **React Testing Library** (`@testing-library/react`), `@testing-library/jest-dom/vitest`, and `@testing-library/user-event`.
  - **Setup**: [`client/src/test/setup.ts`](client/src/test/setup.ts) automatically cleans up DOM state after each test.
* **Test Isolation & QueryClient Wrapper**:
  - Components using TanStack Query must be wrapped with [`renderWithQuery(ui)`](client/src/test/renderWithQuery.tsx).
  - `renderWithQuery` injects a fresh `QueryClient` per test with `retry: false` and `gcTime: Infinity` to prevent slow timeouts and cross-test state leakage.
* **Mocking Standards**:
  - In `beforeEach`, always call both `vi.resetAllMocks()` and `vi.restoreAllMocks()`:
    ```typescript
    beforeEach(() => {
      vi.resetAllMocks();
      vi.restoreAllMocks();
    });
    ```
  - Mock API calls by spying on the shared Axios client: `vi.spyOn(api, "get")`, `vi.spyOn(api, "post")`, etc.
* **Query & Interaction Rules**:
  - Query by accessibility semantics: `screen.getByRole`, `screen.getByLabelText`, `screen.getByPlaceholderText`, `screen.getByText`.
  - Handle asynchronous state updates via `await screen.findBy*` or `await waitFor(() => { expect(...).toBeInTheDocument(); })`.
  - Simulate user typing and clicks with `userEvent.setup()` rather than raw `fireEvent`.
* **Execution Commands**:
  - Single run (client workspace): `bun run --cwd client test:component` (or `bun run --cwd client test`).
  - Interactive watch mode: `bun run --cwd client test:component:watch`.
  - Single run from root: `bun run test:component` (or `bun run test:unit`).

### 5.10 DRY (Don't Repeat Yourself) & Modularization Conventions
* **Core Rule**: **Do not duplicate the same thing twice**. Always use a function, custom hook, shared schema, or reusable component instead. Keep a single source of truth across the entire codebase.
* **Backend DRY**:
  - **Shared Zod Schemas**: Define base reusable schema primitives (e.g., `userNameSchema`, `userEmailSchema`, `userPasswordSchema`, `optionalUserPasswordSchema`) and compose them into request schemas.
  - **Shared Service Utilities & Selectors**: Centralize recurring data transformations (e.g., `normalizeEmail(email)`) and Prisma field projections (e.g., `safeUserSelect`) into reusable functions and constants.
  - **Centralized Controller Error Handling**: Use helper functions (e.g., `handleControllerError`) rather than repeating identical status checking and try/catch boilerplate across controllers.
* **Frontend DRY**:
  - **Feature-Based Modularization**: Organize code domain-by-domain under `src/features/<feature-name>/` containing:
    - `api/`: API service calls using the centralized Axios client (`users.api.ts`).
    - `types/`: Shared TypeScript interfaces and types (`index.ts`).
    - `schemas/`: Shared Zod validation schemas (`user.schema.ts`).
    - `hooks/`: Domain-specific TanStack Query hooks (`useUsers`, `useCreateUser`, `useUpdateUser`).
    - `components/`: Granular, reusable UI components (`UserStatsCards`, `UsersFilter`, `UsersTable`, `PasswordField`).
    - `pages/`: Feature orchestrator pages (`UsersPage.tsx`).
    - `utils/`: Reusable feature helpers (`error.ts`).
    - `__tests__/`: Co-located component and integration test suites.
    - `index.ts`: Clean feature barrel export.
  - **Reusable Form Primitives**: Extract repeating form controls (e.g., `PasswordField` with show/hide password toggle) to avoid duplicating input markup, state, and accessibility attributes.
  - **Reusable Error Formatting**: Use a centralized `getErrorMessage(err, fallback)` helper for extracting API error messages across forms.

---

## 6. Work Log & Progress (From Start)

### Milestone 1: Scope & Planning
- Clarified project goals from `project-scope.md`.
- Finalized autonomy decision: **Full autonomous auto-send**, no human-in-the-loop review needed for standard queries.
- Defined tech stack and documented it in `tech-stack.md`.
- Created a 7-phase execution roadmap in `implementation-plan.md`.

### Milestone 2: Environment & Scaffolding
- Installed and verified **Bun** globally (v1.4.0).
- Created root Bun workspaces `package.json` coordinating `/client` and `/server`.
- Configured `docker-compose.yml` for PostgreSQL 16 with `pgvector`.
- Set up backend in `/server`:
  - Express + TypeScript configuration (`tsconfig.json`, `package.json`).
  - Defined Prisma schema (`User`, `Session`, `Category`, `Ticket`, `Message`, `KnowledgeBaseItem`).
  - Generated Prisma client with `bun run prisma:generate`.
  - Created `.env` and `.env.example`.
- Set up frontend in `/client`:
  - Initialized React 19 + TypeScript with Vite and Bun.
  - Configured Tailwind CSS v4 via `@tailwindcss/vite` and API proxy to port 5000.

### Milestone 3: Health Check & Verification
- Implemented `/api/health` on Express server.
- Built health check consumer in `client/src/App.tsx` fetching `/api/health` and displaying the status.
- Cleaned up all premature folders and mock files per user instruction, leaving a clean, minimal full-stack project skeleton.
- Verified both background tasks running live:
  - Backend: `http://localhost:5000` (`http://localhost:5000/api/health`)
  - Frontend: `http://localhost:5173`

### Milestone 4: Local PostgreSQL & Prisma Integration
- Removed `docker-compose.yml` to keep the architecture simple without containerization.
- Identified local PostgreSQL 18 running on port `5433`.
- Created the dedicated database `helpdesk`.
- Updated `server/.env` with connection string: `postgresql://postgres:postgres@localhost:5433/helpdesk?schema=public`.
- Executed initial Prisma migration (`20260904092144_init`), creating tables for `users`, `session`, `categories`, `tickets`, `messages`, and `knowledge_base_items`.
- Created `server/src/prisma.ts` singleton client.
- Connected the Express app to the database and verified via `SELECT 1` in `GET /api/health`.
- Created modern TypeScript configuration file `server/prisma.config.ts` using `@prisma/config` (validated by Prisma CLI).
- Updated `client/src/App.tsx` to display real-time database connection status.

### Milestone 5: Better Auth Integration (Email/Password & Database Sessions)
- Replaced legacy session packages (`express-session`, `connect-pg-simple`, `bcrypt`) with `better-auth`.
- Created `server/src/auth.ts` configured with `prismaAdapter(prisma, { provider: "postgresql" })` and `emailAndPassword: { enabled: true }`.
- Mounted Better Auth handler `app.all('/api/auth/*', toNodeHandler(auth))` in `server/src/index.ts` before body parsers.
- Defined Better Auth core models (`User`, `Session`, `Account`, `Verification`) in `server/prisma/schema.prisma`.
- Created and executed migration `20260905160511_init_better_auth`, creating all tables and indices in PostgreSQL on port 5433.
- Configured `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `server/.env` and `server/.env.example`.
- Configured `Role` enum (`ADMIN`, `AGENT`) on `User` model with migration `20260905164214_add_role_to_user`.
- Created database seed script `server/prisma/seed.ts` (executable via `bun run prisma:seed`) to populate the initial Admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env variables.
- Verified end-to-end: verified signup restriction, admin seeding idempotency, admin signin, and DB session persistence.

### Milestone 6: Frontend Authentication Flow (Login Page, Navbar, Session Management)
- Installed `better-auth` in `/client` workspace.
- Configured clean Better Auth client in `client/src/lib/auth-client.ts` using `better-auth/client`.
- Implemented `AuthProvider` (`client/src/context/AuthProvider.tsx`) and `useSession` hook (`client/src/context/AuthContext.ts`) via native React 19 context.
- Implemented `Navbar` component (`client/src/components/Navbar.tsx`):
  - Displays brand identity with AI badge.
  - Dynamically observes session state via `useSession()`.
  - When authenticated: displays user avatar, user name, and responsive "Sign out" button.
  - When unauthenticated: displays "Sign in" button.
  - Graceful sign-out handler that terminates the session and redirects to `/login`.
- Built `LoginPage` component (`client/src/pages/LoginPage.tsx`):
  - Form state management and schema validation via `react-hook-form` and `zod` (`@hookform/resolvers/zod`).
  - Standard email and password input fields with inline field validation errors and show/hide password toggle.
  - Server error alert for invalid credentials or network failures.
  - Loading spinner and button disabling during submission.
  - Automatic redirect to home page (`/`) on successful authentication.
  - Auto-redirects already-authenticated users away from `/login`.
- Updated `HomePage` (`client/src/pages/HomePage.tsx`) and `App.tsx`:
  - Configured automatic redirect from `/` to `/login` whenever the user is not authenticated.
  - Displays welcome greeting with user name and live infrastructure status when authenticated.
- Configured email case-insensitivity normalization across stack:
  - Added Better Auth `hooks.before` middleware in `server/src/auth.ts` lowercasing incoming `ctx.body.email`.
  - Normalized email in `client/src/pages/LoginPage.tsx` on submit (`trim().toLowerCase()`).
- Verified end-to-end: session retrieval, invalid login rejection (401), valid login redirect (200), uppercase/mixed-case email sign-in (`TEST@example.com`), session persistence, unauthenticated root redirect, and session destruction on sign-out.

### Milestone 7: shadcn/ui & Default Theme Integration
- Installed and initialized **shadcn CLI** (v4.21.0) for `/client` workspace with Vite + Tailwind CSS v4.
- Configured import path aliases (`@/*` -> `./src/*`) in `client/vite.config.ts`, `client/tsconfig.json`, and `client/tsconfig.app.json`.
- Applied shadcn's official **default theme** (`neutral` base color, Nova preset, CSS variables in OKLCH):
  - Configured `components.json` with `style: "base-nova"`, `baseColor: "neutral"`, `cssVariables: true`, `iconLibrary: "lucide"`.
  - Configured `client/src/index.css` with `@theme inline`, color tokens (`--primary: oklch(0.205 0 0)`, `--background`, `--card`, `--muted`, `--border`, etc.), and `@fontsource-variable/geist`.
- Installed shadcn UI components built on Base UI primitives:
  - `button` (`client/src/components/ui/button.tsx`)
  - `card` (`client/src/components/ui/card.tsx`)
  - `input` (`client/src/components/ui/input.tsx`)
  - `label` (`client/src/components/ui/label.tsx`)
  - `alert` (`client/src/components/ui/alert.tsx`)
  - `separator` (`client/src/components/ui/separator.tsx`)
  - `cn` utility (`client/src/lib/utils.ts`)
- Redesigned `LoginPage` (`client/src/pages/LoginPage.tsx`):
  - Replaced manual Tailwind classes with shadcn `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`, and `<CardFooter>`.
  - Replaced manual inputs and labels with `<Input>` and `<Label>` supporting inline icons and `aria-invalid` error states.
  - Replaced native submit button with shadcn `<Button>` and loading spinner.
  - Replaced manual error div with shadcn `<Alert variant="destructive">`.
- Harmonized application layout and components to use shadcn theme variables:
  - `client/src/App.tsx`: updated wrapper and footer to `bg-background text-foreground border-border bg-card`.
  - `client/src/components/Navbar.tsx`: updated header and buttons to use shadcn `<Button>` and theme tokens.
  - `client/src/pages/HomePage.tsx`: updated cards, badges, and background to match shadcn theme variables.
- Resolved TypeScript 6 deprecation (`baseUrl`) and verified production build: `tsc -b && vite build` builds cleanly in <1s.

### Milestone 8: Admin-Only Route & Users Page
- Created `UsersPage` (`client/src/pages/UsersPage.tsx`) containing a clean heading.
- Enhanced `ProtectedRoute` (`client/src/components/ProtectedRoute.tsx`) with `requiredRole` enforcement.
- Created `AdminRoute` wrapper (`client/src/components/AdminRoute.tsx`) restricting access to users with `role: "ADMIN"`.
- Registered `/users` route in `client/src/App.tsx` guarded by `AdminRoute`.
- Added conditional "Users" link in `Navbar` (`client/src/components/Navbar.tsx`) displayed only for `ADMIN` users.
- Seeded `AGENT` role test user in PostgreSQL database `helpdesk` (`agent@example.com` / `uvdb1357`).
- Configured dedicated `security-reviewer` subagent (`.agents/agents/security-reviewer/agent.md`) specialized for full-stack threat modeling (Gemini AI prompt injection, Better Auth RBAC, email webhook verification, and email loop prevention).
- Confirmed full TypeScript compilation and production build (`bun run build`).

### Milestone 9: Authentication & Authorization Security Hardening
- **Server-Side RBAC Middleware**: Implemented `requireAuth` and `requireAdmin` in `server/src/middleware/auth.middleware.ts` with typed session extraction and role validation.
- **Admin Route Protection**: Created `server/src/routes/admin.routes.ts` (`GET /api/admin/users`) guarded by `requireAdmin` (unauthenticated returns 401, `AGENT` returns 403, `ADMIN` returns 200).
- **Session Token Sanitization**: Implemented `GET /api/me` returning user profile and session metadata while strictly omitting `session.token`.
- **Startup Environment Validation**: Created `server/src/config/env.ts` using Zod to validate `BETTER_AUTH_SECRET` (>= 32 chars), `DATABASE_URL`, URLs, and ports at startup.
- **Secret Hardening**: Removed hardcoded fallback secret `"dev-session-secret-change-in-production-12345"` from `server/src/auth.ts` and pruned `SESSION_SECRET` from `server/.env`.
- **CORS Restriction**: Synchronized Express `cors` and Better Auth `trustedOrigins` using `getTrustedOrigins()`, rejecting unauthorized origins.
- **Rate Limiting**: Configured rate limiting on `/api/auth/*` via Better Auth and `express-rate-limit` (10 requests/min), enabled strictly in the `production` environment (`NODE_ENV === "production"`) to prevent rate-limit interference during testing and development.
- **Database Seed Normalization**: Added `.toLowerCase()` email normalization in `server/prisma/seed.ts`.
- **Verification**: Verified via end-to-end automated test suite across all user roles and endpoints.

### Milestone 10: Playwright & Isolated Test Database Setup
- **Playwright Setup**: Installed `@playwright/test` (v1.63.0) and Playwright Chromium headless/shell binaries.
- **Dedicated Test Database**: Provisioned isolated PostgreSQL test database `helpdesk_test` on port 5433, completely decoupled from development database `helpdesk`.
- **Database Provisioning Automation**: Created `server/scripts/setup-test-db.ts` providing automatic database creation, migration deployment via Prisma CLI, idempotent admin seeding, and `--reset` support with safety guards.
- **Environment Isolation**: Configured `server/.env.test` and root `.env.test` targeting `helpdesk_test` on test ports (Backend: 5001, Frontend: 5174) with `override: true` support under `NODE_ENV=test`.
- **Production-Only Rate Limiting**: Scoped both Express `express-rate-limit` and Better Auth internal `rateLimit` strictly to `NODE_ENV === "production"`.
- **Playwright Configuration**: Created `playwright.config.ts` with dual `webServer` orchestration (server on port 5001 with test db, client on port 5174), single worker for database isolation, and failure artifact captures.
- **Package Scripts**: Added `db:test:setup`, `db:test:reset`, `test:server`, `test:client`, `test:e2e`, `test:e2e:ui`, and `test:e2e:headed` scripts in root `package.json`.
- **E2E Testing Instructions & Agent**: All detailed instructions, testing conventions, user workflows, locators, and operating guidelines for end-to-end testing are codified in [`.agents/agents/playwright-e2e/agent.md`](.agents/agents/playwright-e2e/agent.md).
- **Strict Compliance**: No test specs written per initial prompt instruction; verified clean configuration and dual webServer launch.

### Milestone 11: Authentication E2E Test Suite
- **Authoring & Coverage**: Implemented a comprehensive 14-test Playwright E2E suite covering all authentication scenarios and edge cases:
  - [`e2e/auth/login.spec.ts`](e2e/auth/login.spec.ts):
    - Valid credentials sign-in, redirect to `/`, and Navbar state verification.
    - Case-insensitivity (`TEST@EXAMPLE.COM`, `Admin@Example.com`) and whitespace trimming (`   test@example.com   `).
    - Invalid credentials destructive error alerts (wrong password, non-existent user).
    - Client-side form validation (empty fields, malformed email format).
    - Password visibility toggle (masked `password` vs plain `text`).
  - [`e2e/auth/session.spec.ts`](e2e/auth/session.spec.ts):
    - Session persistence across page reloads.
    - Sign out flow (terminates session, redirects to `/login`, and blocks subsequent protected navigation).
    - Unauthenticated route protection (redirects `/` and `/users` to `/login`).
    - Already-authenticated auto-redirect from `/login` back to `/`.
  - [`e2e/helpers/auth.ts`](e2e/helpers/auth.ts): Shared test user fixtures and reusable UI helpers (`loginViaUI`, `signOutViaUI`).
- **Database Seeding**: Enhanced `server/prisma/seed.ts` to seed `test@example.com`, `admin@example.com`, and `agent@example.com` idempotently in `helpdesk_test`.
- **Verification**: Executed via `bun run test:e2e` against `helpdesk_test` (port 5001 backend, port 5174 frontend): 14/14 tests passed with 100% success rate (26.9s).

### Milestone 12: Admin User List Feature (Full-Stack & E2E)
- **Backend Architecture (`Route -> Controller -> Service -> Prisma Client`)**:
  - `server/src/services/user.service.ts`: `getAllUsers()` fetches all users projecting only safe fields (`id`, `name`, `email`, `role`, `emailVerified`, `image`, `createdAt`, `updatedAt`), sorting by role (Admins first) and date descending.
  - `server/src/controllers/user.controller.ts`: `listUsers()` controller returns standardized envelope `{ success: true, data: users }`.
  - `server/src/routes/user.routes.ts`: `GET /api/users` guarded with `requireAdmin` middleware (unauthenticated requests return 401, `AGENT` returns 403, `ADMIN` returns 200).
  - `server/src/routes/admin.routes.ts`: updated to use `userController.listUsers` for backward compatibility with `GET /api/admin/users`.
  - `server/src/index.ts`: mounted `userRoutes` at `/api/users`.
- **Frontend UI & Access Control**:
  - Created `client/src/components/ui/badge.tsx` (shadcn Badge with `cva`, supporting `admin`, `agent`, `success`, `destructive`, `outline`, and default variants).
  - Redesigned `client/src/pages/UsersPage.tsx`:
    - Summary stat cards: Total Users, Administrators, and Support Agents.
    - Real-time search filter: Filter by name or email with "Clear search filter" button on empty state.
    - Role filter buttons: All, Admins, Agents with badge counters.
    - Users table (`data-testid="users-table"`): User name & initials avatar, email, role badge with icons, email verification status badge, and formatted joined date.
    - Loading skeletons and error alert with "Try Again" retry button.
    - Access control: Route `/users` guarded by `AdminRoute` (redirects non-admins to `/` and unauthenticated to `/login`), with conditional "Users" link in `Navbar` shown only to `ADMIN` users.
  - Replaced native `fetch` with centralized Axios client (`client/src/lib/api.ts`) configured with `withCredentials: true`, using `axios.isAxiosError` for type-safe error handling across `HomePage.tsx` and `UsersPage.tsx`.
  - Integrated **TanStack Query (v5)** (`@tanstack/react-query`) with shared `QueryClient` (`client/src/lib/query-client.ts`) wrapped in `App.tsx`, providing caching, background refetching, and intelligent retry suppression on 401/403/404 errors.
- **E2E Testing with `playwright-e2e` Subagent**:
  - Authored comprehensive 10-test suite in `e2e/users/users-list.spec.ts`:
    - Admin access, navbar navigation, stat cards, table rendering, role badges, and data refresh.
    - Search input filtering and role filter buttons.
    - RBAC enforcement: Agent navbar exclusion, redirect from `/users` to `/`, API rejection with 403 Forbidden.
    - Unauthenticated protection: redirect to `/login`, API rejection with 401 Unauthorized.
    - API backward compatibility: `GET /api/admin/users` returns 200 with safe payload.
- **Verification**:
  - `bun run test:e2e` executed all **24 tests** (14 auth + 10 user list) with **100% pass rate** against `helpdesk_test`.

### Milestone 13: User Creation via Modal Dialog (Full-Stack & E2E)
- **Backend Architecture (`Route -> Controller -> Service -> Prisma Client`)**:
  - `server/src/services/user.service.ts`:
    - Added `createUser({ name, email, password, role })` handling email normalization, conflict detection (duplicate email throws `UserServiceError` with 409), password hashing via `hashPassword` (`better-auth/crypto`), and atomic Prisma creation of `User` (defaulting to `Role.AGENT` and `emailVerified: false`) and linked credential `Account` record.
    - Returns `SafeUser` omitting sensitive credentials.
  - `server/src/controllers/user.controller.ts`:
    - Added `createUser` controller validating request payload with Zod (`name`: min 3 chars, `email`: valid format, `password`: min 8 chars).
    - Returns `400 Bad Request` on validation failure, `409 Conflict` on duplicate email, and `201 Created` with `{ success: true, data: user }`.
  - `server/src/routes/user.routes.ts`:
    - Registered `POST /api/users` guarded under `requireAdmin`.
- **Frontend UI & Modal Component**:
  - `client/src/components/ui/dialog.tsx`: Built accessible shadcn Dialog primitive based on `@base-ui/react/dialog` supporting Backdrop, Popup, Header, Title, Description, Footer, and Close.
  - `client/src/components/CreateUserModal.tsx`:
    - Dialog containing Name (min 3), Email (valid email), and Password (min 8) inputs.
    - Password visibility toggle with Eye/EyeOff icons.
    - React Hook Form + Zod client validation with inline `aria-invalid` error states.
    - Destructive server error alert for 409 conflict and API error messages.
    - TanStack Query mutation invalidating `queryKey: ["users"]` on success, automatically refreshing the user list and closing the modal.
  - `client/src/pages/UsersPage.tsx`:
    - Added "Create User" action button with `UserPlus` icon in header above the user list.
    - Integrated `CreateUserModal` with controlled visibility state.
- **Component & Unit Testing (React Testing Library + Vitest)**:
  - Added dedicated unit test suite for `CreateUserModal` in `client/src/components/CreateUserModal.test.tsx` (11 tests):
    - Rendering when `isOpen: true` and unmounting when `isOpen: false`.
    - Dismissal via Cancel button, Escape key, and clicking outside on the backdrop.
    - Password visibility toggling between password and text.
    - Field validations (name < 3, invalid email, password < 8).
    - Submission handling with `POST /api/users`, query cache invalidation, and modal dismissal.
    - Server error alert rendering on API rejection.
  - Added 9 integration test scenarios in `client/src/pages/UsersPage.test.tsx` (22 tests).
  - Total Vitest component/unit tests: **33 / 33 passed**.
- **E2E Testing (Playwright against `helpdesk_test`)**:
  - Authored comprehensive 8-test suite in `e2e/users/create-user.spec.ts`:
    - Modal opening, Cancel button dismissal, **Escape key dismissal**, and **outside backdrop click dismissal**.
    - Client-side validation triggers (name, email, password).
    - Admin user creation flow, modal dismissal, and table row verification with Agent badge.
    - Authentication verification: Newly created user logs in with their credentials and verifies non-admin access restrictions.
    - Duplicate email conflict error handling.
    - RBAC API protection: 401 Unauthorized for unauthenticated requests and 403 Forbidden for agent requests to `POST /api/users`.
- **Verification**:
  - `bun run test:e2e`: **32/32 tests passed** (14 auth + 10 user list + 8 create user).
  - `bun run test:component`: **33/33 tests passed** in Vitest (2 test files).
  - Full TypeScript build: `bun run build:server` and `bun run build:client` compile with zero errors.

### Milestone 14: User Editing & Password Management (Full-Stack & E2E)
- **Backend Architecture (`Route -> Controller -> Service -> Prisma Client`)**:
  - `server/src/services/user.service.ts`:
    - Added `UpdateUserInput` interface (`name?`, `email?`, `password?`).
    - Added `updateUser(id, input)` service function using `prisma.$transaction`.
    - Handles email normalization and collision checks (throws 409 if email is in use by another user).
    - Checks user existence (throws 404 if not found).
    - If `password` is provided, hashes it using `hashPassword` (`better-auth/crypto`) and updates/upserts the credential `Account` record. If `password` is omitted/undefined, existing password and accounts remain untouched.
    - Updates user fields (`name`, `email`) and returns projected `SafeUser`.
  - `server/src/controllers/user.controller.ts`:
    - Added `updateUserSchema` (Zod) validating optional `name` (min 3), optional `email` (valid email format), and optional `password` (min 8 chars).
    - Added `updateUser` controller handler. Validates `id` URL param, executes service, and returns `200 OK` with `{ success: true, data: user }`.
  - `server/src/routes/user.routes.ts`:
    - Registered `PATCH /api/users/:id` guarded by `requireAdmin`.
- **Frontend UI & Modal Component**:
  - `client/src/components/EditUserModal.tsx`:
    - Modal dialog displaying Name, Email, and Password fields.
    - Pre-populates Name and Email with the selected user's current values when opened (`useEffect` / `reset`).
    - Password field defaults empty with placeholder: `"Leave blank to keep current password"`.
    - Password visibility toggle (`Eye` / `EyeOff` icons).
    - React Hook Form + Zod client validation (`editUserSchema`) enforcing name (min 3 chars), valid email, and optional password (if entered, min 8 chars).
    - Server error alert displaying API/conflict errors.
    - TanStack Query mutation calling `PATCH /api/users/:id`, invalidating `queryKey: ["users"]` on success, closing the dialog and refreshing the user list.
  - `client/src/pages/UsersPage.tsx`:
    - Added `editingUser` state (`SafeUser | null`).
    - Added "Actions" column to table header and rows.
    - In each user row, added an Edit button with `Pencil` icon (`data-testid="edit-user-${user.id}"`).
    - Integrated `<EditUserModal>` to control dialog visibility based on `editingUser`.
- **Component & Unit Testing (React Testing Library + Vitest)**:
  - Authored `client/src/components/EditUserModal.test.tsx` (12 tests):
    - Pre-population of Name and Email fields.
    - Rendering when `isOpen: true` and unmounting when `isOpen: false`.
    - Dismissal via Cancel button, Escape key, and backdrop clicks.
    - Password visibility toggle.
    - Validation error checks (name < 3, invalid email, password < 8).
    - Successful submission without password (sending `{ name, email }`).
    - Successful submission with password (sending `{ name, email, password }`).
    - Server error alert rendering on API rejection (e.g. 409 email already in use).
  - Updated `client/src/pages/UsersPage.test.tsx` (25 tests):
    - Adjusted skeleton loading count for the new Actions column (28 skeletons across 4 rows).
    - Added tests for clicking Edit button opening modal and submitting edit updates.
  - Vitest component/unit tests: **48 / 48 passed** across 3 test files.
- **E2E Testing (Playwright against `helpdesk_test`)**:
  - Authored comprehensive 9-test suite in `e2e/users/edit-user.spec.ts`:
    - Modal opening with pre-populated fields and Cancel button dismissal.
    - Escape key dismissal and outside backdrop click dismissal.
    - Form validation rules for name, email, and password.
    - Conflict handling: Attempting to update to an existing user's email displays error alert.
    - User editing without password change: Updates user name and verifies login persists with original password.
    - User editing with password change: Updates user password and verifies login with the new password.
    - RBAC API security boundaries: Rejects unauthenticated PATCH with 401 and Agent user PATCH with 403.
- **Verification**:
  - `bun run test:e2e`: **41 / 41 tests passed** (auth, users-list, create-user, edit-user).
  - `bun run --cwd client test`: **48 / 48 tests passed** in Vitest.
  - `bun run --cwd server build` and `bun run --cwd client build`: Both compile with zero TypeScript errors.

### Milestone 15: Feature-Based Modularization & DRY Architecture Refactoring (Full-Stack)
- **Architecture Transformation**:
  - Reorganized both frontend and backend from scattered flat/type-based directories into structured feature modules (`features/auth` and `features/users`) following Bulletproof React conventions.
  - **Backend (`server/src/features/`)**:
    - `features/auth/`: Encapsulated Better Auth server configuration (`auth.ts`), RBAC middleware (`auth.middleware.ts`), and barrel export (`index.ts`).
    - `features/users/`: Modularized `user.routes.ts`, `user.controller.ts`, `user.service.ts`, `user.schema.ts`, `user.types.ts`, and barrel export (`index.ts`).
    - Maintained full backward compatibility with lightweight re-exports in legacy paths.
  - **Frontend (`client/src/features/`)**:
    - `features/auth/`: Context (`AuthContext.ts`, `AuthProvider.tsx`), route guards (`ProtectedRoute.tsx`, `AdminRoute.tsx`), auth client (`lib/auth-client.ts`), login view (`pages/LoginPage.tsx`), and barrel export (`index.ts`).
    - `features/users/`:
      - `api/users.api.ts`: Centralized Axios requests (`getUsers`, `createUser`, `updateUser`).
      - `types/index.ts`: Strongly typed interfaces (`UserItem`, `RoleFilter`, `CreateUserInput`, `UpdateUserInput`).
      - `schemas/user.schema.ts`: Single source of truth for Zod validation schemas (`userNameSchema`, `userEmailSchema`, `userPasswordSchema`, `createUserSchema`, `editUserSchema`).
      - `hooks/`: Custom TanStack Query hooks (`useUsers`, `useCreateUser`, `useUpdateUser`).
      - `components/`: Granular extracted components (`UserStatsCards`, `UsersFilter`, `UsersTable`, `PasswordField`, `CreateUserModal`, `EditUserModal`).
      - `pages/UsersPage.tsx`: Lean orchestrator page composing modular components and hooks.
      - `utils/error.ts`: Shared error message extractor (`getErrorMessage`).
      - `__tests__/`: Co-located Vitest test suites (6 test files).
      - `index.ts`: Feature barrel export.
- **DRY Principle Enforcement**:
  - Replaced duplicated password visibility toggle state and UI markup with reusable `<PasswordField>` component.
  - Composed client and server Zod schemas from reusable primitive validators (`userNameSchema`, `userEmailSchema`, `userPasswordSchema`).
  - Extracted shared Prisma field projection `safeUserSelect` eliminating repetitive `select` definitions in `user.service.ts`.
  - Extracted `normalizeEmail(email)` helper function ensuring consistent email normalization.
  - Extracted `handleControllerError` helper in `user.controller.ts` standardizing API error responses.
  - Extracted `getErrorMessage` on client for consistent error unwrapping across modals.
- **Verification**:
  - Vitest Unit Tests: **57 / 57 tests passed** across 6 test files.
  - Playwright E2E Tests: **41 / 41 tests passed** against `helpdesk_test`.
  - Production Builds: `bun run --cwd server build` and `bun run --cwd client build` completed cleanly with exit code 0.

---

### Milestone 16: User Deletion with Confirmation Modal, Admin Protection & Soft Deletion (Full-Stack)
- **Database Schema & Migrations**:
  - Added `deletedAt DateTime? @map("deleted_at")` and `@@index([deletedAt])` to `User` in `server/prisma/schema.prisma`.
  - Created migration `20260907120000_add_deleted_at_to_user` and applied it to both `helpdesk` and `helpdesk_test`.
- **Backend Architecture (`Route -> Controller -> Service -> Prisma`)**:
  - `server/src/features/users/user.types.ts`: Added `deletedAt?: Date | null` to `SafeUser`.
  - `server/src/features/users/user.service.ts`:
    - Updated `safeUserSelect` projection to include `deletedAt: true`.
    - `getAllUsers()` filters out soft-deleted accounts (`where: { deletedAt: null }`).
    - `updateUser()` validates user exists and is not soft-deleted.
    - `deleteUser(id)`: validates user exists, blocks admin deletion (`if (user.role === Role.ADMIN) throw new UserServiceError("Administrators cannot be deleted", 400)`), and atomically executes `prisma.$transaction` setting `deletedAt = now()` and deleting active Better Auth sessions (`tx.session.deleteMany({ where: { userId: id } })`).
  - `server/src/features/users/user.controller.ts`: Added `deleteUser` handler utilizing centralized `handleControllerError`.
  - `server/src/features/users/user.routes.ts`: Mounted `DELETE /:id` under `requireAdmin`.
  - `server/src/features/auth/auth.ts`:
    - Added `deletedAt` to Better Auth additional fields.
    - In `hooks.before`, blocked soft-deleted accounts from logging in by throwing `new APIError("UNAUTHORIZED", { message: "This account has been deactivated." })`.
  - `server/src/features/auth/auth.middleware.ts`: Verified active user is not soft-deleted in `requireAuth`.
- **Frontend Architecture (`client/src/features/users/`)**:
  - `types/index.ts`: Added `deletedAt?: string | null` to `UserItem`.
  - `api/users.api.ts`: Added `deleteUser(id: string)` API method.
  - `hooks/useDeleteUser.ts`: Mutation hook calling `deleteUser` and invalidating `["users"]` cache.
  - `components/DeleteUserModal.tsx`: Confirmation modal dialog featuring target user's name/email, destructive styling, confirmation action with spinner, and error alert via `getErrorMessage`.
  - `components/UsersTable.tsx`: Added `onDeleteUser` prop; rendered disabled delete button with `title="Administrators cannot be deleted"` for Admin rows and enabled delete button for Agent rows.
  - `pages/UsersPage.tsx`: Added `deletingUser` state and rendered `<DeleteUserModal>`.
  - `features/users/index.ts`: Exported `DeleteUserModal` and `useDeleteUser`.
- **Testing & Verification**:
  - Vitest Unit Tests:
    - Updated `UsersTable.test.tsx` verifying disabled admin button and enabled agent delete trigger.
    - Created `DeleteUserModal.test.tsx` (6 tests) verifying modal rendering, dismissal (Cancel, Escape, backdrop), mutation dispatch, and error handling.
    - Updated `UsersPage.test.tsx` verifying full delete flow integration.
    - **66 / 66 Vitest tests passed** across 7 test files.
  - Playwright E2E Tests:
    - Created `e2e/users/delete-user.spec.ts` (9 tests) covering modal lifecycle, admin deletion prevention (UI disabled + 400 Bad Request API), successful soft deletion and UI removal, login prevention for deactivated user, and RBAC / security boundaries.
    - **50 / 50 Playwright E2E tests passed** across all 5 test files.
  - Production Builds:
    - Server: `tsc` compiled cleanly with exit code 0.
    - Client: `tsc -b && vite build` built cleanly with exit code 0.

---

### Milestone 17: Inbound Email to Ticket Conversion (Single Model, Integer ID, Optional Category)
- **Database Schema & Architecture**:
  - Adopted a clean **single-model architecture**: consolidated all required columns into `Ticket` (no separate `Message` or `Category` tables).
  - Configured auto-incrementing integer primary key: `id Int @id @default(autoincrement())`.
  - Configured `senderName String @map("sender_name")` as a required non-null column.
  - Configured `category String?` as an optional column with **no default value** (ready for future AI classification).
  - Merged email content columns: `body`, `htmlBody`, `messageId`, `senderEmail`, `subject`, `status` (`OPEN`, `RESOLVED`, `CLOSED`), and `priority` (`LOW`, `MEDIUM`, `HIGH`).
  - Added `assignedTickets Ticket[]` relation to `User`.
  - Created migration `20260907074742_create_tickets_table` and deployed cleanly to both `helpdesk` and test database `helpdesk_test`.
- **Backend Modular Architecture (`server/src/features/tickets/`)**:
  - `ticket.types.ts`: Strongly typed interfaces (`InboundEmailPayload`, `ParsedEmailAddress`, `CreateTicketInput`).
  - `ticket.schema.ts`: Zod schema `inboundEmailSchema` validating webhook inputs and `ticketIdParamSchema` validating integer route params.
  - `ticket.utils.ts`: Reusable utilities (DRY) for RFC 5322 sender parsing (`parseEmailAddress`), fallback name derivation (`deriveNameFromEmail`), and subject sanitization (`cleanSubject`).
  - `ticket-ingest.service.ts`: `ingestInboundEmail` persisting new tickets with auto-increment ID, required sender name, and null category.
  - `ticket.service.ts`: Queries for retrieving tickets by integer ID (`getTicketById`) and listing all tickets (`getAllTickets`).
  - `ticket.controller.ts`: Webhook handler `handleInboundEmail` and retrieval handlers.
  - `ticket.routes.ts`: Mounted public webhook `POST /api/webhooks/email` and authenticated routes `GET /api/tickets`, `GET /api/tickets/:id`.
  - Mounted in `server/src/index.ts`.
- **Verification**:
  - Server Unit Tests (`bun test server/src/features/tickets/__tests__/`): **15 / 15 passed** (11 in `ticket.utils.test.ts`, 4 in `ticket-ingest.service.test.ts`).
  - Client Vitest Tests (`bun run test:unit`): **60 / 60 passed**.
  - Playwright E2E Tests (`bun run test:e2e`): **42 / 42 passed** (including 5 new E2E tests in `e2e/tickets/inbound-email.spec.ts`).
  - Production Builds: Server (`tsc`) and Client (`tsc -b && vite build`) built cleanly with 0 errors.

---

### Milestone 18: TicketCategory Enum Definition & Database Migration
- **Schema & Database Layer**:
  - Defined `enum TicketCategory` in `server/prisma/schema.prisma`:
    - `GENERAL_QUESTION`: For general support and course inquiries.
    - `TECHNICAL_QUESTION`: For technical bugs, video player, and system issues.
    - `REFUND_REQUEST`: For billing, payments, and refund inquiries.
  - Updated `Ticket.category` from `String?` to `TicketCategory?` (maintaining optional status with no default value).
  - Preserved `@@index([category])` for optimal filtering performance.
  - Generated and executed migration `20260907081724_change_ticket_category_to_enum` on both `helpdesk` and `helpdesk_test`.
- **Backend Modular Layer (`server/src/features/tickets/`)**:
  - `ticket.types.ts`: Re-exported `TicketCategory` from `@prisma/client` and updated `CreateTicketInput` and `InboundEmailPayload`.
  - `ticket.schema.ts`: Created `ticketCategorySchema` with robust `normalizeCategory` preprocessor that maps variants (e.g. `"Technical Questions"`, `"technical_question"`, `"General Question"`, `"Refund request"`) into canonical `TicketCategory` enum values.
  - `ticket-ingest.service.ts`: Updated to persist optional `payload.category` when provided, defaulting to `null` when omitted.
- **Verification**:
  - Server Unit Tests (`bun test server/src/features/tickets/__tests__/`): **24 / 24 passed** (including new `ticket.schema.test.ts`).
  - Client Vitest Tests (`bun run test:unit`): **60 / 60 passed**.
  - Playwright E2E Tests (`bunx playwright test e2e/tickets/inbound-email.spec.ts`): **6 / 6 passed** (including new test verifying `TicketCategory` enum persistence).
  - Production Builds: Server (`tsc`) and Client (`tsc -b && vite build`) compiled cleanly with 0 errors.

---

### Milestone 19: Ticket List Feature (Sorted Newest First)
- **Backend Architecture (`server/src/features/tickets/`)**:
  - `ticket.service.ts`: Updated `getAllTickets` to order by `createdAt: "desc"` (newest first) by default, and support optional filtering by `status`, `category`, `search` query, or explicit `sort` ("newest" | "oldest").
  - `ticket.schema.ts`: Added `ticketQuerySchema` with Zod validation for query parameters.
  - `ticket.controller.ts`: Updated `getTickets` to parse query parameters and return 400 for malformed filters.
  - Server unit tests (`ticket.service.test.ts`): Added 3 tests validating newest-first ordering, category filtering, and multi-field text search.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - `types/index.ts`: Strongly typed interfaces (`TicketItem`, `TicketFilters`, `StatusFilter`, `CategoryFilter`, `SortFilter`).
  - `api/tickets.api.ts`: Centralized Axios methods (`getTickets`, `getTicketById`).
  - `hooks/useTickets.ts`: TanStack Query hook managing caching, background sync, and error states.
  - `components/TicketStatusBadge.tsx`: Visual status indicators for `OPEN`, `RESOLVED`, `CLOSED`.
  - `components/TicketPriorityBadge.tsx`: Visual priority indicators for `LOW`, `MEDIUM`, `HIGH`.
  - `components/TicketCategoryBadge.tsx`: Category tags for `GENERAL_QUESTION`, `TECHNICAL_QUESTION`, `REFUND_REQUEST`, and `Uncategorized`.
  - `components/TicketStatsCards.tsx`: Summary cards for Total, Open, Resolved, and Closed tickets.
  - `components/TicketsFilter.tsx`: Search input with clear button, Status tabs with counts, Category dropdown, and Sort selector.
  - `components/TicketsTable.tsx`: Full responsive table rendering tickets ordered newest first with customer details, badges, formatted dates, skeleton loading, and empty states.
  - `pages/TicketsPage.tsx`: Full page orchestrator.
  - `Navbar.tsx` & `App.tsx`: Added "Tickets" navigation link for all authenticated users (agents and admins), mounted `/tickets`.
- **Verification**:
  - Server Unit Tests (`bun test server/src/features/tickets/__tests__/`): **27 / 27 passed**.
  - Client Vitest Tests (`bun run test:unit`): **67 / 67 passed** across 10 test files.
  - Playwright E2E Tests: Added `e2e/tickets/ticket-list.spec.ts` validating newest-first ordering and route protection.
  - Production Builds: Server (`tsc`) and Client (`tsc -b && vite build`) compile with 0 errors.

---

### Milestone 20: Ticket Route Separation & Component-First Test Realignment
- **Route Isolation & Dashboard Separation**:
  - Isolated the full tickets table and management view strictly to `/tickets` (`TicketsPage.tsx`).
  - Restored `/` strictly as the HomePage / Dashboard.
  - Navigation bar cleanly separates Dashboard (`/`), Tickets (`/tickets`), and Admin Users (`/users`).
- **Test Suite Optimization (Component-First Strategy)**:
  - Pruned redundant UI search and filter tests from Playwright E2E (`e2e/tickets/ticket-list.spec.ts`), keeping only essential happy-path ordering and route protection.
  - Migrated search, filtering, and tab switching test coverage to thorough Vitest + React Testing Library component tests in `client/src/features/tickets/__tests__/TicketsPage.test.tsx`.
  - Client component test suite: **73 / 73 passing** across 10 test suites.
  - Playwright E2E test suite: Streamlined to **45 / 45 passing** focused on critical integration and security paths.
- **Project Memory Policy**:
  - Formalized strict policy: Going forward, rely mostly on component tests (React Testing Library + Vitest) for UI logic, filters, sorting, form validation, and states. Use Playwright E2E only when strictly necessary for critical cross-boundary workflows and security boundaries.

---

### Milestone 21: TanStack Table Integration with Server-Side Sorting & Realistic Ticket Seeding
- **TanStack Table Integration (`client/src/features/tickets/components/TicketsTable.tsx`)**:
  - Integrated `@tanstack/react-table` (v8.21.3) into `TicketsTable.tsx`.
  - Configured with `manualSorting: true` and `enableSortingRemoval: false` so that table row ordering is driven strictly by the backend PostgreSQL database without client-side array re-sorting.
  - Interactive column headers for `Ticket` (subject), `Customer` (senderName), `Category`, `Priority`, `Status`, and `Created` (createdAt).
  - Directional sorting indicators: `ArrowUp` for ascending sort (`data-testid="sort-asc-{columnId}"`), `ArrowDown` for descending sort (`data-testid="sort-desc-{columnId}"`), and `ArrowUpDown` with subtle opacity for unsorted columns (`data-testid="sort-none-{columnId}"`).
- **Server-Side Sorting Architecture (`server/src/features/tickets/`)**:
  - `ticket.types.ts`: Added `TicketSortField` (`createdAt`, `priority`, `status`, `category`, `subject`, `senderName`, `senderEmail`, `id`) and `TicketSortOrder` (`asc`, `desc`). Updated `TicketFilterQuery` to include `sortBy` and `sortOrder`.
  - `ticket.schema.ts`: Added `ticketSortFieldSchema` and `ticketSortOrderSchema`. Updated `ticketQuerySchema` with Zod validation for `sortBy` and `sortOrder`, while maintaining full backward compatibility with legacy `sort="newest"|"oldest"`.
  - `ticket.service.ts`: Implemented dynamic `orderBy` query construction supporting any valid `TicketSortField` with secondary tie-breaking on `id: "desc"`.
- **Client API & Query Orchestration (`client/src/features/tickets/`)**:
  - `types/index.ts`: Updated `TicketFilters` with `sortBy?: TicketSortField` and `sortOrder?: TicketSortOrder`.
  - `api/tickets.api.ts`: Forwarded `sortBy` and `sortOrder` as URL parameters to `GET /api/tickets`.
  - `pages/TicketsPage.tsx`: Managed `sorting: SortingState` initialized to `[{ id: "createdAt", desc: true }]`, passed `{ sortBy, sortOrder }` to `useTickets` (TanStack Query), and synchronized with the filter sort dropdown. Removed client-side `.sort(...)` from `filteredTickets` useMemo.
- **Root Development Script**:
  - Added `"dev": "bun --filter \"*\" dev"` to root `package.json` to allow running both client and server concurrently with a single command.
- **Realistic Data Seeding (`server/prisma/seed-tickets.ts`)**:
  - Created dedicated seed script inserting 100 realistic, diverse tickets into PostgreSQL across all categories (25 Technical, 25 Refund, 25 General, 26 Uncategorized), priorities (24 High, 33 Medium, 44 Low), statuses (46 Open, 37 Resolved, 18 Closed), and staggered over 45 days.
  - Added `"prisma:seed:tickets": "bun prisma/seed-tickets.ts"` to `server/package.json`.
- **Verification**:
  - Server Unit Tests (`bun test`): **59 / 59 passed** across 7 files, including new sorting tests in `ticket.schema.test.ts` and `ticket.service.test.ts`.
  - Client Vitest Tests (`bun run test`): **77 / 77 passed** across 10 files, including TanStack Table header click and sort indicator tests.
  - Playwright E2E Tests: Added column header sorting test in `e2e/tickets/ticket-list.spec.ts` (**3 / 3 passed**).
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile with 0 errors.

---

### Milestone 22: Server-Side Filtering with TanStack Table (Status, Category, Priority, Debounced Search & Global Counts)
- **Backend Server-Side Filtering Architecture (`server/src/features/tickets/`)**:
  - `ticket.types.ts`: Added `priority?: TicketPriority` to `TicketFilterQuery` and exported `TicketCounts` interface (`total`, `open`, `resolved`, `closed`).
  - `ticket.schema.ts`: Updated `normalizeCategory` preprocessor to recognize `"UNCATEGORIZED"`, `"NONE"`, or `"NULL"` and convert to `null`. Added `priority: z.nativeEnum(TicketPriority).optional()` to `ticketQuerySchema`.
  - `ticket.service.ts`:
    - Updated `getAllTickets` to check `query.category !== undefined` so `category: null` queries `where.category = null` (`WHERE "category" IS NULL`).
    - Handled `where.priority = query.priority`.
    - Added `getTicketCounts()` method executing parallel `prisma.ticket.count()` queries for overall totals and status breakdowns.
  - `ticket.controller.ts`: Updated `getTickets` to execute `getAllTickets(query)` and `getTicketCounts()` in parallel via `Promise.all` and return `{ success: true, data: tickets, counts }`.
- **Client Architecture & UI Integration (`client/src/features/tickets/`)**:
  - `types/index.ts`: Added `PriorityFilter` (`"ALL" | TicketPriority`), `TicketCounts` interface, and added `priority?: PriorityFilter` to `TicketFilters`.
  - `api/tickets.api.ts`: Updated `getTickets` to forward `status`, `category` (including `"UNCATEGORIZED"`), `priority`, and `search` query parameters to the backend. Returns `GetTicketsResult = { tickets, counts }`.
  - `hooks/useTickets.ts`: Updated TanStack Query hook to query `GetTicketsResult` with key `["tickets", filters]`, exposing `tickets` and `counts`.
  - `components/TicketsFilter.tsx`: Added **Priority** filter dropdown (`data-testid="tickets-priority-select"`) with options: `All Priorities`, `Low`, `Medium`, `High`.
  - `components/TicketsTable.tsx`: Added `manualFiltering: true` to `useReactTable` configuration alongside `manualSorting: true`.
  - `pages/TicketsPage.tsx`:
    - Added `priorityFilter` state (`useState<PriorityFilter>("ALL")`).
    - Added **300ms debounce** on search input (`debouncedSearchQuery`) preventing network spam on keystrokes.
    - Removed client-side `useMemo` filtering (`filteredTickets`); passes server-filtered tickets directly to `TicketsTable`.
    - Connected server `counts` to `<TicketStatsCards>` and status tab counters with fallback, ensuring tab numbers remain accurate even when filtering by a specific status.
    - Updated `hasActiveFilters` and `handleClearFilters` to include `priorityFilter`.
- **Testing & Verification**:
  - Server Unit Tests (`bun test src`): **42 / 42 passed** (tested `normalizeCategory` uncategorized handling, `ticketQuerySchema` priority validation, and `ticketService` priority/category/status/counts queries).
  - Client Vitest Tests (`bun run test`): **78 / 78 passed** across 10 test suites (tested Priority select and debounced server-side query parameters in `TicketsPage.test.tsx`).
  - Playwright E2E Tests (`bunx playwright test`): **47 / 47 passed** across all 8 test files, including new E2E test verifying debounced search, category filter, priority select, and filter reset against PostgreSQL test database.
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile cleanly with 0 errors.

---

### Milestone 23: Server-Side Pagination with TanStack Table (Page Size Selector, Navigation & Count Synchronization)
- **Backend Server-Side Pagination Architecture (`server/src/features/tickets/`)**:
  - `ticket.types.ts`:
    - Defined `PaginationMeta` (`page`, `pageSize`, `totalCount`, `totalPages`).
    - Defined `PaginatedTicketsResult` (`tickets: TicketSummary[]`, `pagination: PaginationMeta`).
    - Added optional `page?: number` and `pageSize?: number` to `TicketFilterQuery`.
  - `ticket.schema.ts`:
    - Added `page: z.coerce.number().int().positive().default(1)` and `pageSize: z.coerce.number().int().positive().max(100).default(10)` to `ticketQuerySchema`.
  - `ticket.service.ts`:
    - Updated `getAllTickets` to calculate `skip = (page - 1) * pageSize` and `take = pageSize`.
    - Executed `prisma.ticket.findMany({ where, skip, take, orderBy })` and `prisma.ticket.count({ where })` concurrently via `Promise.all`.
    - Calculated `totalPages = Math.max(1, Math.ceil(totalCount / pageSize))` and returned `PaginatedTicketsResult`.
  - `ticket.controller.ts`:
    - Executed `getAllTickets(query)` and `getTicketCounts()` in parallel, returning `{ success: true, data: tickets, pagination, counts }`.
- **Frontend Architecture & UI Integration (`client/src/features/tickets/`)**:
  - `types/index.ts`: Added `PaginationMeta` interface and updated `TicketFilters` to include optional `page?: number` and `pageSize?: number`.
  - `api/tickets.api.ts`: Mapped `filters.page` and `filters.pageSize` into URL search parameters; updated return type to `GetTicketsResult = { tickets, pagination, counts }`.
  - `hooks/useTickets.ts`: Updated to configure `placeholderData: keepPreviousData` from `@tanstack/react-query` to ensure flicker-free page transitions, and exposed `pagination` alongside `tickets` and `counts`.
  - `components/TicketsTable.tsx`:
    - Added `manualPagination: true` and `pageCount: pagination?.totalPages ?? -1` to `useReactTable`.
    - Integrated responsive pagination footer displaying:
      - Item range info: `Showing {start} to {end} of {totalCount} tickets` (`data-testid="pagination-info"`).
      - Page size dropdown: `10`, `20`, `50` (`data-testid="pagination-page-size-select"`).
      - Navigation controls: First (`<<`), Previous (`<`), Current page info (`Page X of Y`), Next (`>`), Last (`>>`).
  - `pages/TicketsPage.tsx`:
    - Added `page` (default: 1) and `pageSize` (default: 10) state.
    - Updated search debounce effect to skip initial mount via `useRef(true)`, preventing premature page resets.
    - Automatically resets `page` to `1` whenever any filter changes (status, category, priority, debounced search, or page size).
- **Testing & Verification**:
  - Server Unit Tests (`bun test src`): **44 / 44 passed** (including new `ticketQuerySchema` pagination defaults/bounds validation and `ticketService.getAllTickets` pagination query tests).
  - Client Vitest Tests (`bun run test`): **80 / 80 passed** across 10 test suites (including `TicketsTable.test.tsx` pagination footer/controls and `TicketsPage.test.tsx` page navigation & reset tests).
  - Playwright E2E Tests: Added pagination E2E test in `e2e/tickets/ticket-list.spec.ts` verifying page info, navigation controls, and page size selector (**5 / 5 passed**).
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile cleanly with 0 errors.

---

### Milestone 24: Ticket Detail Page & Subject Click Navigation (Full-Stack & E2E)
- **Ticket List Subject & Row Navigation (`client/src/features/tickets/components/TicketsTable.tsx` & `TicketsPage.tsx`)**:
  - Wrapped ticket subject with accessible React Router `<Link to={`/tickets/${ticket.id}`} ...>` (`data-testid="ticket-subject-${ticket.id}"`).
  - Wired up `onSelectTicket={(ticket) => navigate(`/tickets/${ticket.id}`)}` in `TicketsPage.tsx`, ensuring clicking the subject text or anywhere on the ticket table row seamlessly navigates to `/tickets/${ticket.id}`.
  - Added click stop-propagation on the subject link preventing double trigger on row clicks.
  - Interactive styling: `font-semibold text-foreground hover:text-primary hover:underline transition-colors truncate block`.
- **Date Formatting Utility (`client/src/features/tickets/utils/date.ts`)**:
  - Extracted shared `formatDate(dateStr)` helper conforming to the DRY principle. Re-exported from `TicketsTable.tsx` for full backwards compatibility.
- **Client Server-State Hook (`client/src/features/tickets/hooks/useTicket.ts`)**:
  - Implemented `useTicket(id)` using TanStack Query (`queryKey: ["tickets", numericId]`).
  - Validates positive numeric IDs and retrieves data via `getTicketById(numericId)` from `tickets.api.ts`.
  - Maps 404 to `"Ticket not found"` and 401 to `"You must be signed in to view this ticket."`.
  - Exposes `ticket`, `isLoading`, `isFetching`, `isNotFound`, `isValidId`, `errorMessage`, and `refetch`.
- **Ticket Detail Page (`client/src/features/tickets/pages/TicketDetailPage.tsx`)**:
  - Header: Back button (`<Link to="/tickets">` / `data-testid="back-to-tickets"`) and Refresh button with spinner on fetch (`data-testid="refresh-ticket-button"`).
  - Ticket Heading & Badges: Ticket ID badge (`#${id}`), `TicketStatusBadge`, `TicketPriorityBadge`, `TicketCategoryBadge`, and prominent subject title.
  - 2-Column Responsive Layout:
    - **Message Card**: Customer avatar/initials, customer name (`data-testid="ticket-sender-name"`), email with mailto link (`data-testid="ticket-sender-email"`), formatted timestamp, and message body (`data-testid="ticket-detail-body"`).
    - **Sidebar Cards**:
      - "Ticket Details" card displaying status, priority, category, assigned agent (name or "Unassigned"), creation time, and last updated time.
      - "Customer Details" card displaying sender name and email.
  - Comprehensive states: Skeleton loading state (`data-testid="ticket-detail-skeleton"`), Not Found / Invalid ID state (`data-testid="ticket-not-found"`), and Destructive Error alert with Retry button (`data-testid="ticket-detail-error"`).
  - Re-exported via `client/src/pages/TicketDetailPage.tsx` and barrel export `client/src/features/tickets/index.ts`.
- **Route Guard Registration (`client/src/App.tsx`)**:
  - Mounted `/tickets/:id` guarded by `<ProtectedRoute>`.
- **Router Test Harness Enhancement (`client/src/test/renderWithQuery.tsx`)**:
  - Wrapped `renderWithQuery` with `MemoryRouter` supporting configurable `route` and `routerProps`, simplifying router-aware testing across components.
- **Search Debounce Fix (`client/src/features/tickets/pages/TicketsPage.tsx`)**:
  - Replaced brittle `useRef(true)` with clean `searchQuery === debouncedSearchQuery` guard, eliminating unintended page resets in React StrictMode.
- **Testing & Verification**:
  - Server Unit Tests (`bun test server/src`): **46 / 46 passed** (added `ticketService.getTicketById` test suite for existing record with assignee relation and non-existent record returning null).
  - Client Vitest Tests (`bun run test:component`): **89 / 89 passed** across 11 test files (8 new tests in `TicketDetailPage.test.tsx` and new subject link test in `TicketsTable.test.tsx`).
  - Playwright E2E Tests (`bunx playwright test e2e/tickets/ticket-list.spec.ts`): **6 / 6 passed** (including new test verifying navigation from ticket subject to ticket details page, content assertions, and returning via "Back to Tickets").
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile cleanly with 0 errors.

---

### Milestone 25: Ticket Assignment to Agents (Full-Stack Mutation & UI)
- **Backend Architecture (`Route -> Controller -> Service -> Prisma`)**:
  - `ticket.schema.ts`: Added `assignTicketSchema` and `AssignTicketInput` (normalizes `assignedToId: string | null`, coercing empty strings/whitespace to `null`).
  - `ticket.service.ts`:
    - Added `TicketServiceError` with HTTP status code support.
    - Added `assignTicket(ticketId: number, assignedToId: string | null)`: verifies ticket exists (throws 404), verifies assigned user exists and is not soft-deleted (`deletedAt === null`, throws 400), updates `assignedToId` atomically, and returns updated ticket including `assignedTo: { id, name, email, role }`.
    - Added `getAssignableUsers()`: returns active platform users (`where: { deletedAt: null }`) with safe projection `{ id, name, email, role }` sorted by name.
  - `ticket.controller.ts`: Added `assignTicket` and `getAssignees` controller handlers with validation and error formatting.
  - `ticket.routes.ts`: Mounted `GET /api/tickets/assignees` and `PATCH /api/tickets/:id/assign` under `requireAuth` (ensuring `/assignees` is registered before `/:id` to avoid route param collisions).
  - `user.routes.ts`, `user.controller.ts`, `user.service.ts`: Added `GET /api/users/assignees` under `requireAuth` before `requireAdmin` for platform-wide API consistency.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - `api/tickets.api.ts`: Added `assignTicket(id, assignedToId)` and `getAssignableUsers()` with type safety and safe array fallback.
  - `hooks/useAssignTicket.ts`:
    - `useAssignableUsers()`: Query hook caching assignees under `["users", "assignees"]` with 5-minute stale time.
    - `useAssignTicket(ticketId: number)`: Mutation hook executing `assignTicket` that immediately updates query cache `["tickets", ticketId]` and invalidates list/counts queries while preserving the current ticket detail state without duplicate network calls.
  - `pages/TicketDetailPage.tsx`:
    - Replaced static assignee text with an interactive `<select>` dropdown (`data-testid="assignee-select"`).
    - Populated with all active assignable agents with role tags (`(Admin)` / `(Agent)`).
    - Displays active saving indicator (`data-testid="assigning-spinner"`) during pending mutations.
    - Displays inline error message (`data-testid="assign-error-message"`) if assignment fails.
    - Maintains `data-testid="assigned-agent-name"` and `data-testid="assigned-agent-unassigned"` for seamless backward compatibility.
  - `index.ts`: Re-exported `useAssignTicket` and `useAssignableUsers`.
- **Testing & Verification**:
  - Server Unit Tests (`bun test server/src`): **57 / 57 passed** across 4 test files. Covered `assignTicket` assigning, reassigning, unassigning, 404 on missing ticket, 400 on non-existent or soft-deleted user, and `getAssignableUsers` filtering.
  - Client Vitest Tests (`bun run test:component`): **93 / 93 passed** across 11 test files. Added 4 comprehensive tests in `TicketDetailPage.test.tsx` verifying dropdown rendering, agent assignment mutation, unassignment, and error alert.
  - Playwright E2E Tests (`bunx playwright test e2e/tickets/ticket-list.spec.ts`): **7 / 7 passed** against `helpdesk_test`. Added E2E test covering agent login, ticket navigation, dropdown agent selection, immediate DOM update, and unassignment back to "Unassigned".
  - Production Builds:
    - Server: `tsc` type-check completed with 0 errors.
    - Client: `tsc -b && vite build` built with 0 errors.

---

### Milestone 26: Edit Ticket Status & Category (Full-Stack Mutation & UI)
- **Backend Architecture (`Route -> Controller -> Service -> Prisma`)**:
  - `ticket.schema.ts`: Added `updateTicketSchema` and `UpdateTicketInput` supporting partial updates to `status`, `category` (normalized via `ticketCategorySchema`), `priority`, and `assignedToId`. Enforces at least one field must be provided in the update payload.
  - `ticket.service.ts`:
    - Added `updateTicket(ticketId: number, input: UpdateTicketInput)`: verifies ticket exists (throws 404), verifies assigned user is active if `assignedToId` is provided (throws 400), dynamically updates fields via `Prisma.TicketUncheckedUpdateInput`, and returns the updated ticket record with `assignedTo` relation.
  - `ticket.controller.ts`: Added `updateTicket` controller method with input validation and error formatting.
  - `ticket.routes.ts`: Mounted `PATCH /api/tickets/:id` under `requireAuth`.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - `api/tickets.api.ts`: Added `UpdateTicketInput`, `UpdateTicketResponse`, and `updateTicket(id, data)` API client function.
  - `hooks/useUpdateTicket.ts`: Implemented `useUpdateTicket(ticketId)` mutation hook that immediately updates the specific ticket in TanStack Query cache (`["tickets", ticketId]`) and invalidates list/stats queries without redundant refetches of the active detail view.
  - `pages/TicketDetailPage.tsx`:
    - Added interactive Status dropdown (`data-testid="status-select"`) with options `OPEN`, `RESOLVED`, and `CLOSED`.
    - Added interactive Category dropdown (`data-testid="category-select"`) with options `GENERAL_QUESTION`, `TECHNICAL_QUESTION`, `REFUND_REQUEST`, and `""` (Uncategorized).
    - Preserved badge rendering at top of page and inside sidebar cards (`TicketStatusBadge`, `TicketCategoryBadge`).
    - Added spinners (`data-testid="status-updating-spinner"`, `data-testid="category-updating-spinner"`) during active mutations.
    - Added inline error alert (`data-testid="ticket-update-error"`) if updates fail.
  - `index.ts`: Re-exported `useUpdateTicket`.
- **Testing & Verification**:
  - Server Unit Tests (`bun test server/src`): **68 / 68 passed** across 4 test files. Tested schema parsing, status transitions (`OPEN` -> `RESOLVED` -> `CLOSED`), category changes (`GENERAL_QUESTION` -> `TECHNICAL_QUESTION` -> `null`), and 404 handling.
  - Client Vitest Tests (`bun run test:component`): **99 / 99 passed** across 11 test files. Added 6 new unit tests in `TicketDetailPage.test.tsx` verifying status/category select rendering, API mutations, Uncategorized handling, and error states.
  - Playwright E2E Tests (`bunx playwright test e2e/tickets/ticket-list.spec.ts`): **8 / 8 passed** against `helpdesk_test`. Added E2E test verifying agent ticket status transitions and category re-classifications in real-time.
  - Production Builds:
    - Server: `tsc` type-check completed with 0 errors.
    - Client: `tsc -b && vite build` built with 0 errors.

---

### Milestone 27: Ticket Replies & Conversation Thread (Full-Stack & E2E)
- **Database Schema & Migrations**:
  - Defined `enum ReplySenderType { AGENT, CUSTOMER, AI }` in `server/prisma/schema.prisma`.
  - Added `model TicketReply` with `id`, `ticketId` (with `onDelete: Cascade`), `userId` (with `onDelete: SetNull`), `senderType`, `body`, and timestamps, mapped to table `ticket_replies`.
  - Added relations `replies TicketReply[]` to both `Ticket` and `User`.
  - Created migration `20260908081522_add_ticket_replies` and deployed to both development DB `helpdesk` and test DB `helpdesk_test`.
- **Backend Architecture (`Route -> Controller -> Service -> Prisma`)**:
  - `ticket.types.ts`: Re-exported `ReplySenderType`, `TicketReply`, defined `TicketReplyAuthor`, `TicketReplyItem`, and `TicketWithDetails`.
  - `ticket.schema.ts`: Added `createReplySchema` (Zod validation for body min 1, max 10000 chars, optional `status`).
  - `ticket.service.ts`:
    - Updated `getTicketById(id)` to include `replies` ordered chronologically (`createdAt: asc`) with user projection (`id`, `name`, `email`, `role`).
    - Added `createReply(ticketId, userId, body, options)`: verifies ticket exists, verifies agent is not soft-deleted, creates reply record, updates ticket `updatedAt` and optional `status` in an atomic transaction.
    - Added `getRepliesByTicketId(ticketId)`: fetches all replies for a ticket chronologically.
  - `ticket.utils.ts`: Added `normalizeSubject` helper stripping common reply/forward prefixes (`Re:`, `RE:`, `Fwd:`, `FW:`).
  - `ticket-ingest.service.ts`: Updated `ingestInboundEmail` to detect when an incoming webhook email comes from the same sender with matching subject (direct match or `normalizeSubject` match). Instead of duplicating tickets, it atomically creates a `TicketReply` with `senderType: CUSTOMER`, re-opens the ticket (`status: OPEN`), and refreshes `updatedAt`.
  - `ticket.controller.ts`: Added `createReply` and `getReplies` controller handlers.
  - `ticket.routes.ts`: Mounted `GET /api/tickets/:id/replies` and `POST /api/tickets/:id/replies` under `requireAuth`.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - `components/ui/textarea.tsx`: Built accessible shadcn Textarea primitive.
  - `types/index.ts`: Added `ReplySenderType`, `TicketReplyAuthor`, `TicketReplyItem`, and `TicketItem.replies`.
  - `api/tickets.api.ts`: Added `createTicketReply` and `getTicketReplies`.
  - `hooks/useCreateReply.ts`: TanStack Query mutation hook optimistically updating query cache `["tickets", ticketId]` and invalidating list queries.
  - `components/TicketRepliesThread.tsx`: Renders conversation thread. Distinguishes Agent replies (using `reply.user?.name` and Admin/Agent badge) from Customer replies (resolving `ticket.senderName` and `ticket.senderEmail` with Customer badge). Displays formatted timestamps and clean body formatting. Handles empty state gracefully.
  - `components/TicketReplyForm.tsx`: Reply composer card below the thread with Textarea, validation error messaging, optional status dropdown ("Keep current", "Open", "Resolved", "Closed"), submit button with loading spinner, and destructive error alert.
  - `pages/TicketDetailPage.tsx`: Integrated `<TicketRepliesThread>` and `<TicketReplyForm>` directly below the main customer message card.
  - `index.ts`: Re-exported all new reply components and hooks.
- **Testing & Verification**:
  - Server Unit Tests (`bun test`): **108 / 108 passed** across 7 test files (including new unit tests for `normalizeSubject`, `ingestInboundEmail` matching same sender and exact/Re: subject, re-opening resolved tickets, and distinct ticket creation for different subjects).
  - Client Vitest Tests (`bun run test:unit`): **112 / 112 passed** across 13 test files.
  - Playwright E2E Tests (`bunx playwright test e2e/tickets/ticket-list.spec.ts`): **10 / 10 passed** against `helpdesk_test`, including E2E test verifying customer follow-up webhook emails append to thread with `Customer` badge and sender details.
  - Production Builds:
- **Milestone 28: Ticket Details Modular Refactoring (Zero Function & UI Change)**:
  - `components/TicketDetails.tsx`: Extracted basic ticket details (header metadata: id, status badge, priority badge, category badge, subject heading, and message card with customer avatar, sender name, sender email, formatted timestamp, and body) into a dedicated component. Strictly excludes replies.
  - `components/UpdateTicket.tsx`: Extracted the entire right sidebar column (Ticket Details card with status select, priority badge, category select, assignee select with spinners and error alerts, creation/updated dates, and Customer Details card). Accepts explicit props or defaults gracefully to TanStack Query hooks (`useAssignableUsers`, `useAssignTicket`, `useUpdateTicket`).
  - `components/TicketDetailSkeleton.tsx`: Extracted the full loading skeleton for ticket details (`data-testid="ticket-detail-skeleton"`), keeping layout hierarchy, skeleton dimensions, and responsive grid structure identical.
  - `components/BackToTicketsButton.tsx`: Extracted the reusable `<Link to="/tickets"><Button variant="default" size="sm" className="gap-2" data-testid="back-to-tickets-btn"><ArrowLeft className="h-4 w-4" />Back to Tickets</Button></Link>` component.
  - `pages/TicketDetailPage.tsx`: Cleaned and modularized page orchestrator down to ~167 lines, cleanly delegating responsibilities to the newly extracted components while maintaining 100% test ID fidelity and visual layout parity.
  - `components/ui/button.tsx`: Exported `ButtonProps` type for clean reusable button prop typing.
  - `index.ts`: Re-exported `TicketDetails`, `UpdateTicket`, `TicketDetailSkeleton`, and `BackToTicketsButton`.
  - **Testing & Verification**:
    - Client Unit Tests: **123 / 123 passed** across 17 test suites (including dedicated unit test suites for `TicketDetails.test.tsx`, `UpdateTicket.test.tsx`, `TicketDetailSkeleton.test.tsx`, and `BackToTicketsButton.test.tsx`).
    - Playwright E2E Tests (`bunx playwright test e2e/tickets/ticket-list.spec.ts`): **10 / 10 passed** against `helpdesk_test`.
    - Production Build: `bun run build` in `client` compiled and bundled cleanly with 0 TypeScript or Vite errors.

---

### Milestone 29: Closed Ticket Replies Protection & Mutation Cache Preservation
- **Preserve Existing Replies on Closed Tickets**:
  - When a ticket status is set to `CLOSED`, all existing replies in the conversation thread remain visible and completely intact in the UI ("keep the replies as it is do not remove them").
- **Prevent Reply Submissions on Closed Tickets**:
  - `TicketReplyForm.tsx`: If `currentStatus === "CLOSED"`, replaces the reply composer form with a banner card (`data-testid="ticket-closed-reply-disabled"`) featuring a lock icon and message: *"This ticket is closed. New replies cannot be added to a closed ticket. Reopen the ticket to continue the conversation."* Textarea and submit button are completely hidden while closed.
  - Dynamically restores the reply composer when the ticket status is reopened (e.g. from `CLOSED` back to `OPEN` via the sidebar dropdown).
  - `ticket.service.ts`: Added validation in `createReply` rejecting reply attempts on closed tickets with a 400 error: `TicketServiceError("Cannot add replies to a closed ticket", 400)`.
- **Query Cache & API Mutation Defense-in-Depth**:
  - `server/src/features/tickets/ticket.service.ts`: Updated `updateTicket` and `assignTicket` to include `replies` (ordered chronologically by `createdAt: asc` with user relations) and return `Promise<TicketWithDetails>`, ensuring backend mutation responses carry full ticket state.
  - `client/src/features/tickets/hooks/useUpdateTicket.ts` & `useAssignTicket.ts`: Updated `setQueryData` cache updates with `replies: updatedTicket.replies ?? prev.replies` so status and assignee changes never overwrite or drop existing replies from the client cache.
- **Testing & Verification**:
  - Server Unit Tests (`bun test`): **109 / 109 passed** across 7 test files, verifying `createReply` rejects replies to closed tickets with a 400 error.
  - Client Vitest Tests (`bun run test`): **125 / 125 passed** across 17 test files, verifying `TicketReplyForm` renders the closed banner and hides form inputs when `currentStatus === "CLOSED"`, and `TicketDetailPage` keeps replies visible when closed.
  - Playwright E2E Tests (`bunx playwright test e2e/tickets/ticket-list.spec.ts`): **10 / 10 passed** against `helpdesk_test`, verifying end-to-end ticket closing keeps replies visible, hides reply input, displays closed banner, and restores reply form upon reopening.
  - Production Builds: Both client (`tsc -b && vite build`) and server (`tsc`) pass with 0 errors.

### Milestone 30: Strict E2E Test Anti-Duplication & Unit Test Consolidation
- **Anti-Duplication Policy Enforcement**:
  - Removed all redundant Playwright E2E tests that were already covered by unit or component tests (form validation, password toggles, modal open/close transitions, empty search states, sorting, pagination, clear filters, and backend CRUD/schema error codes).
  - Pruned `e2e/tickets/inbound-email.spec.ts` (API-only checks duplicate of Bun unit tests).
  - Pruned `e2e/tickets/ticket-list.spec.ts` (table sorting, pagination, search filtering duplicate of Vitest tests).
  - Removed bloated `e2e/users/` folder (`create-user.spec.ts`, `delete-user.spec.ts`, `edit-user.spec.ts`, `user-crud.spec.ts`, `users-list.spec.ts`).
  - Added unit test suites to provide 100% unit coverage for replaced behavior:
    - `client/src/features/auth/__tests__/LoginPage.test.tsx`: Validates required fields, email formatting, password toggle, error alert banners, and redirect logic.
    - `server/src/features/users/__tests__/user.service.test.ts`: Validates email normalization, user creation, password hashing, active/deleted filtering, password updates, and administrator deletion protection.
    - `server/src/features/users/__tests__/user.schema.test.ts`: Validates Zod payload validation rules.
- **Lean, Essential Playwright Suite (Functionality that CANNOT be tested with unit tests)**:
  - `e2e/auth/login.spec.ts`: Real browser sign-in flow verifying Better Auth HttpOnly cookie creation, home redirect, and navbar user avatar display.
  - `e2e/auth/session.spec.ts`: Real session persistence across reload (`page.reload()`), real sign-out terminating cookies, route guards for `/`, `/users`, `/tickets`, and authenticated redirect from `/login`.
  - `e2e/rbac/admin-routes.spec.ts`: Real browser RBAC verifying `ADMIN` sees and accesses `/users`, while `AGENT` has the link hidden and is redirected.
  - `e2e/tickets/ticket-workflow.spec.ts`: True cross-boundary integration journey (Inbound student email webhook -> Agent reviews in UI -> Agent replies in browser -> Student replies via email webhook -> Full conversation thread visible and persists across reload).
- **Test Results**:
  - Server Unit Tests (`bun test`): **127 / 127 passed** across 9 files.
  - Client Unit Tests (`bun run test:unit`): **132 / 132 passed** across 18 files.
  - Playwright E2E Tests (`bun run test:e2e`): **10 / 10 passed** in 37s with 0 redundancy.

---

### Milestone 31: Ticket Unassignment on User Deletion
- **Requirement & Behavior**:
  - When a user is deleted (soft-deleted via `deleteUser`), all tickets assigned to that user (`assignedToId === id`) are automatically and atomically unassigned (`assignedToId: null`).
- **Backend Architecture (`server/src/features/users/user.service.ts`)**:
  - Updated `deleteUser(id)` transaction to execute `await tx.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } })` alongside user soft deletion and session revocation.
  - Added unit test in `server/src/features/users/__tests__/user.service.test.ts` verifying that soft-deleting an agent resets `assignedToId` to `null` across all tickets assigned to that agent while leaving other agents' tickets untouched.
- **Frontend Cache Synchronization (`client/src/features/users/hooks/useDeleteUser.ts`)**:
  - Updated `useDeleteUser` mutation hook's `onSuccess` to invalidate both `["users"]` and `["tickets"]` query keys, ensuring ticket lists and detail views immediately reflect the unassigned state upon user deletion without requiring manual page reload.
- **Testing & Verification**:
  - Server Unit Tests (`bun test`): **130 / 130 passed** across 9 files.
  - Client Unit Tests (`bun run test:unit`): **134 / 134 passed** across 18 files.
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile cleanly with 0 errors.

---

### Milestone 32: AI-Powered Reply Polishing with Vercel AI SDK and GPT-5.6 Luna
- **Feature & Requirements**:
  - On the Ticket Details page (`/tickets/:id`), added an AI **Polish** button (`data-testid="polish-reply-button"`) placed immediately before the **Send Reply** button in `TicketReplyForm`.
  - When clicked, improves the agent's draft message using **GPT-5.6 Luna** via the **Vercel AI SDK** (`ai` + `@ai-sdk/openai`).
  - Replaces the textarea content with the polished reply so the agent can review, tweak, and submit.
- **Backend Architecture (`server/src/features/tickets/`)**:
  - Installed `ai` and `@ai-sdk/openai` in Bun workspace.
  - Added `polishReplySchema` in `ticket.schema.ts` validating non-empty input (`text`, `body`, or `draft`).
  - Added `polishReply(ticketId, draftReply)` in `ticket.service.ts`:
    - Context injection: optionally incorporates customer ticket subject and issue description into the prompt.
    - Guides GPT-5.6 Luna to maintain empathy, professional tone, technical instructions, and key facts while preventing fabricated commitments.
  - Controller & Routes:
    - Added `ticketController.polishReply`.
    - Mounted `POST /api/tickets/:id/polish-reply` and `POST /api/tickets/polish-reply` guarded by `requireAuth`.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - Installed `ai` and `@ai-sdk/react`.
  - Added `polishTicketReply` in `tickets.api.ts` and `usePolishReply` mutation hook in `hooks/usePolishReply.ts`.
  - Updated `TicketReplyForm.tsx` to render the Polish button with a `Sparkles` icon, loading spinner (`Polishing...`), disabled states across controls during generation, and error alert rendering.
- **Testing & Verification**:
  - Added unit tests in `ticket.schema.test.ts` for `polishReplySchema`.
  - Added unit tests in `ticket-polish.service.test.ts` for `polishReply` with mocked AI generation and prompt assertions.
  - Added 4 unit tests in `TicketReplyForm.test.tsx` verifying button placement, validation error on empty message, successful text replacement, and error banner display.

---

### Milestone 33: Multi-Path Environment Variable Resolution Fix
- **Problem Identified**:
  - When launching the server from the root directory (e.g. `bun dev` or root npm scripts), `dotenv.config()` looked only in `process.cwd()/.env`.
  - The root `.env` only contained `DATABASE_URL`, while `OPENAI_API_KEY` was stored in `server/.env`.
  - This caused `@ai-sdk/openai` to fail at runtime with `OpenAI API key is missing`.
- **Resolution**:
  - Synchronized the root `.env` and `server/.env` files with the complete set of environment variables (including `OPENAI_API_KEY`).
  - Enhanced `server/src/config/env.ts` to search and load `.env` from multiple paths (`process.cwd()`, `server/`, and directory-relative via `import.meta.dirname`), guaranteeing variables load consistently regardless of working directory.
  - Updated `ticket.service.ts` to validate `env.OPENAI_API_KEY` and instantiate the provider via `createOpenAI({ apiKey })` before calling `generateText`.

---

### Milestone 34: Ticket & Conversation History AI Summarization
- **Feature & Requirements**:
  - Added the ability to summarize an entire ticket and its complete conversation history.
  - Added a **Summarize** button with a `Sparkles` icon placed below the message text inside the ticket card (`data-testid="summarize-ticket-button"`).
  - Re-generates a fresh summary on every click.
  - Generates concise summaries (2-3 sentences, maximum 60 words) without raw markdown symbols (`##`, `**`, `- `).
- **Backend Architecture (`server/src/features/tickets/`)**:
  - Added `summarizeTicket(ticketId)` in `ticket.service.ts`:
    - Queries ticket and all replies in chronological order, mapping author types (`Customer`, `Agent ${name}`, `AI Assistant`).
    - Instructs GPT-5.6 Luna to produce an objective, scan-friendly summary answering: 1) What the customer needs, 2) Key interaction/action so far, and 3) Current status or immediate next step.
    - Added `cleanSummaryText(text)` in `ticket.utils.ts` to strip raw markdown headers (`##`), asterisks (`**`), bullets (`- `), and backticks.
  - Added `ticketController.summarizeTicket` and mounted `POST /api/tickets/:id/summarize` guarded by `requireAuth`.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - Added `summarizeTicket` in `tickets.api.ts` and `useSummarizeTicket` mutation hook in `hooks/useSummarizeTicket.ts`.
  - Updated `TicketDetails.tsx` to render the Summarize button with `Sparkles` icon below the message and an AI summary container (`data-testid="ticket-summary-content"`).
  - Added client-side text sanitization ensuring clean plain text display free of markdown symbols.
- **Testing & Verification**:
  - Added unit tests in `ticket.utils.test.ts` for `cleanSummaryText`.
  - Added unit tests in `ticket-polish.service.test.ts` for `summarizeTicket` with full reply conversation history.
  - Added unit tests in `TicketDetails.test.tsx` verifying button rendering below the message, API call, summary display, re-generation on subsequent clicks, and error handling.
  - Server Unit Tests (`bun test`): **141 / 141 passed** across 10 files.
  - Client Unit Tests (`bun run test:unit`): **141 / 141 passed** across 18 files.
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile with 0 errors.

---

### Milestone 35: Agent Sign-off on AI Polish Replies
- **Feature & Requirements**:
  - Included the agent's name in the closing sign-off of AI polished replies (e.g., `Regards,\n<agent_name>`).
- **Backend Architecture (`server/src/features/tickets/`)**:
  - Added optional `agentName` in `polishReplySchema` (`ticket.schema.ts`).
  - Added `ensureAgentSignOff(text, agentName)` in `ticket.utils.ts` to guarantee sign-offs are formatted as `Regards,\n<agent_name>`, replacing placeholders like `[Agent Name]`, preserving existing sign-offs, and completing trailing "Regards,".
  - Updated `ticketService.polishReply(ticketId, draftReply, agentName)` in `ticket.service.ts` to instruct GPT-5.6 Luna with explicit sign-off guidelines and agent context.
  - Updated `ticketController.polishReply` in `ticket.controller.ts` to extract the agent name from the request body or the authenticated session (`req.user?.name`).
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - Updated `polishTicketReply` in `tickets.api.ts` and `usePolishReply` hook to accept optional `agentName`.
  - Updated `TicketReplyForm.tsx` to retrieve the current user's name via `useSession()` and pass it to `polishReply`.
- **Testing & Verification**:
  - Added unit tests in `ticket.utils.test.ts` for `ensureAgentSignOff` covering trailing regards, placeholders, existing sign-offs, and missing names.
  - Added unit tests in `ticket.schema.test.ts` for `agentName` in `polishReplySchema`.
  - Added unit tests in `ticket-polish.service.test.ts` for `polishReply` with `agentName` in prompt and sign-off guarantee.
  - Added component test in `TicketReplyForm.test.tsx` verifying `agentName` inclusion in request and text area population.
  - Server Unit Tests (`bun test`): **149 / 149 passed** across 10 files.
  - Client Unit Tests (`bun run test:unit`): **142 / 142 passed** across 18 files.
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile with 0 errors.

---

### Milestone 36: Customer Name Greeting in AI Polished Replies
- **Feature & Requirements**:
  - Automatically addresses the customer by first name in the greeting of AI polished replies (`Dear <cust_first_name>,`).
- **Backend Architecture (`server/src/features/tickets/`)**:
  - Added optional `customerName` in `polishReplySchema` (`ticket.schema.ts`).
  - Added `extractFirstName(fullName)` in `ticket.utils.ts` to extract and capitalize the first name from full names, display names, and handles (skipping courtesy titles like Dr., Mr., Ms.).
  - Added `ensureCustomerGreeting(text, customerFirstName)` in `ticket.utils.ts` to normalize existing greetings (Hi, Hello, Dear Customer) or prepend `Dear <cust_first_name>,\n\n`.
  - Updated `ticketService.polishReply(ticketId, draftReply, agentName, customerName)` in `ticket.service.ts`:
    - Reads `senderName` from the ticket database record if not passed in the request body.
    - Instructs GPT-5.6 Luna with explicit greeting guidelines: `Dear <cust_first_name>,`.
    - Guarantees both customer greeting and agent sign-off in the final output.
  - Updated `ticketController.polishReply` to extract `customerName` from the request body.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - Updated `polishTicketReply` in `tickets.api.ts` and `usePolishReply` hook to accept optional `customerName`.
  - Updated `TicketReplyForm.tsx` to accept `customerName` prop and forward it to `polishReply`.
  - Updated `TicketDetailPage.tsx` to pass `customerName={ticket.senderName}` to `TicketReplyForm`.
- **Testing & Verification**:
  - Added unit tests in `ticket.utils.test.ts` for `extractFirstName` and `ensureCustomerGreeting`.
  - Added unit tests in `ticket.schema.test.ts` for `customerName` in `polishReplySchema`.
  - Added unit tests in `ticket-polish.service.test.ts` verifying greeting generation and DB fallback.
  - Added component test in `TicketReplyForm.test.tsx` verifying customer name is passed and greeting rendered.
  - Server Unit Tests (`bun test`): **159 / 159 passed** across 10 files.
  - Client Unit Tests (`bun run test:unit`): **143 / 143 passed** across 18 files.
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile with 0 errors.

---

### Milestone 37: Comprehensive Unit Testing for AI Polish & Summarization
- **Feature & Testing Scope**:
  - Authored comprehensive unit test suites covering all layers of the AI polish and summarization functionality across server and client.
- **Backend Unit Tests (`server/src/features/tickets/__tests__/`)**:
  - [`ticket-polish.service.test.ts`](file:///E:/mosh%20Hamedani%20course/helpdesk/server/src/features/tickets/__tests__/ticket-polish.service.test.ts):
    - `polishReply`: Empty draft validation, prompt context injection (subject, body, agentName, customerName), greeting normalization, model failure handling (502 error mapping), and missing API key rejection.
    - `summarizeTicket`: Non-existent ticket handling (404), conversation history mapping (Customer, Agent, AI Assistant), empty replies fallback, AI generation failure handling (502), and markdown symbol stripping.
  - [`ticket-ai.controller.test.ts`](file:///E:/mosh%20Hamedani%20course/helpdesk/server/src/features/tickets/__tests__/ticket-ai.controller.test.ts) (New):
    - Tested `ticketController.polishReply` for 200 success with/without ticketId, 400 invalid ticketId param, 400 validation error on empty payload, agentName precedence (body over session), customerName forwarding, TicketServiceError status mapping, and 500 unexpected exception handling.
    - Tested `ticketController.summarizeTicket` for 200 success, 400 invalid param, 404 not found, 502 AI failure, and 500 error handling.
  - [`ticket.utils.test.ts`](file:///E:/mosh%20Hamedani%20course/helpdesk/server/src/features/tickets/__tests__/ticket.utils.test.ts):
    - Thorough unit tests for `cleanSummaryText`, `ensureAgentSignOff`, `extractFirstName`, and `ensureCustomerGreeting`.
  - [`ticket.schema.test.ts`](file:///E:/mosh%20Hamedani%20course/helpdesk/server/src/features/tickets/__tests__/ticket.schema.test.ts):
    - Validation tests for `polishReplySchema` accepting `text`, `body`, `draft`, `agentName`, and `customerName`.
- **Frontend Unit Tests (`client/src/features/tickets/`)**:
  - [`tickets-ai.api.test.ts`](file:///E:/mosh%20Hamedani%20course/helpdesk/client/src/features/tickets/api/__tests__/tickets-ai.api.test.ts) (New):
    - Unit tests for `polishTicketReply` verifying endpoint URLs with/without ticketId, payload formatting (text, agentName, customerName), return value extraction, and error rejection.
    - Unit tests for `summarizeTicket` verifying endpoint invocation, summary return, and error propagation.
  - [`TicketReplyForm.test.tsx`](file:///E:/mosh%20Hamedani%20course/helpdesk/client/src/features/tickets/__tests__/TicketReplyForm.test.tsx):
    - Component unit tests for polish button rendering, validation on empty draft, loading spinner/disabled states, error alert rendering, session agentName forwarding, and customerName forwarding.
  - [`TicketDetails.test.tsx`](file:///E:/mosh%20Hamedani%20course/helpdesk/client/src/features/tickets/__tests__/TicketDetails.test.tsx):
    - Component unit tests for summarize button, API triggering, summary rendering, continuous re-generation on each click, and error alert states.
- **Verification**:
  - Server Unit Tests (`bun test`): **176 / 176 passed** across 11 files.
  - Client Unit Tests (`bun run test:unit`): **149 / 149 passed** across 19 files.
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile with 0 errors.

---

### Milestone 38: Automatic Non-Blocking Ticket Classification with GPT
- **Feature & Requirements**:
  - Automatically classifies incoming tickets using GPT in a non-blocking fashion.
  - When an incoming support email arrives (`POST /api/webhooks/email` or `POST /api/tickets/inbound`), the server immediately responds to the webhook sender with `201 Created` with `<50ms` latency without waiting for LLM inference.
  - In the background, GPT (`gpt-5.6-luna` via Vercel AI SDK `@ai-sdk/openai` + `generateText` with `Output.object`) analyzes the ticket subject and body.
  - Predicts `TicketCategory` (`GENERAL_QUESTION`, `TECHNICAL_QUESTION`, `REFUND_REQUEST`), detects urgency `TicketPriority` (`LOW`, `MEDIUM`, `HIGH`), and records reasoning.
  - Updates the ticket record in PostgreSQL (`prisma.ticket.update`).
  - Preserves explicit category if already provided by caller (e.g. specialized webhook headers or test data).
  - Skips classification on incoming follow-up reply messages (`isReply: true`).
  - Includes manual `POST /api/tickets/:id/classify` route for authenticated agents to re-classify on demand.
- **Backend Architecture (`server/src/features/tickets/`)**:
  - `ticket-classification.service.ts`:
    - Structured output schema `ticketClassificationOutputSchema` with `category`, `priority`, and `reasoning`.
    - `classifyTicket(ticketId)`: Queries ticket, checks `OPENAI_API_KEY`, calls GPT with `Output.object`, validates structured output, updates PostgreSQL record.
    - `classifyTicketAsync(ticketId)`: Non-blocking background worker with complete error catching and logging, ensuring zero unhandled promise rejections.
  - `ticket.controller.ts`:
    - Updated `handleInboundEmail` to return `Promise<IngestInboundEmailResult | null>`.
    - Added `classifyTicket(req, res)` controller action.
  - `ticket.routes.ts`:
    - Updated `webhookRoutes.post("/email")` and `ticketRoutes.post("/inbound")` to trigger `ticketClassificationService.classifyTicketAsync(ticket.id)` non-blocking when a new ticket has no category.
    - Mounted `ticketRoutes.post("/:id/classify", requireAuth, ...)` for manual agent classification.
  - `index.ts`: Barrel export updated with `export * from "./ticket-classification.service"`.
- **Testing & Verification**:
  - Authored `ticket-classification.service.test.ts` (12 unit tests):
    - Technical question, refund request, and general question classification verification.
    - Database persistence verification (`category` and `priority` columns).
    - 404 TicketServiceError when ticket does not exist.
    - 502 TicketServiceError mapping when AI generation fails.
    - Graceful background error handling in `classifyTicketAsync`.
    - `POST /api/tickets/:id/classify` controller action success (200) and invalid param (400).
    - Non-blocking webhook integration triggering async classification on uncategorized tickets.
    - Skipping classification when category is already set or when message is a reply.
  - Server Unit Tests (`bun test`): **188 / 188 passed** across 12 files.
  - Production Builds: `bun run build` in `server` compiled cleanly with exit code 0.

---

### Milestone 39: pg-boss Background Job Queue Integration for Ticket Classification
- **Feature & Requirements**:
  - Replaced ad-hoc in-process promises with **pg-boss** (`pg-boss` v12.30.0), a battle-tested PostgreSQL-based background job queue.
  - When an incoming support email arrives (`POST /api/webhooks/email` or `POST /api/tickets/inbound`), the server immediately responds to the caller with `201 Created` (< 60ms).
  - The ticket classification job `{ ticketId }` is enqueued into `pg-boss` queue (`ticket-classification`).
  - Uses native PostgreSQL `LISTEN/NOTIFY` (`useListenNotify: true` + `{ notify: true }`) for instant, low-latency dispatch (< 300ms) without waiting for slow polling intervals.
  - Configured with automatic retry policies: `retryLimit: 3`, `retryDelay: 5` seconds, exponential backoff (`retryBackoff: true`), and 60-second expiration.
  - Gracefully discards deleted/non-existent tickets (404) without useless retries.
  - Graceful lifecycle integration in `server/src/index.ts` with `startQueue()` on startup and `stopQueue({ graceful: true })` on `SIGINT`/`SIGTERM`.
- **Backend Architecture (`server/src/`)**:
  - `queue.ts`:
    - Singleton `PgBoss` client initialized with `DATABASE_URL`.
    - `startQueue()`: Starts worker on `ticket-classification` queue with `LISTEN/NOTIFY`.
    - `stopQueue()`: Graceful worker shutdown and database pool termination.
    - `clearQueue()`: Utility for test/maintenance purging of jobs (`deleteAllJobs`).
    - `enqueueTicketClassification(ticketId)`: Idempotently ensures queue is started and enqueues job with retry policy.
  - `features/tickets/ticket-classification.service.ts`:
    - `classifyTicketAsync(ticketId)`: Delegates directly to `enqueueTicketClassification(ticketId)`.
  - `features/tickets/ticket.routes.ts`:
    - Inbound email routes (`/email`, `/inbound`) enqueue classification jobs via `classifyTicketAsync`.
- **Testing & Verification**:
  - Authored `server/src/__tests__/queue.test.ts` (3 tests):
    - Validates queue name constants and singleton instance.
    - Tests end-to-end `LISTEN/NOTIFY` dispatch: enqueues job -> worker processes -> database record updated.
  - Updated `ticket-classification.service.test.ts`:
    - Validates `classifyTicketAsync` enqueuing to `pg-boss` and UUID return format.
    - Validates error handling when queue dispatch rejects.
---

### Milestone 40: Ticket Auto-Resolution via Knowledge Base & NEW / PROCESSING State Machine
- **Feature & Requirements**:
  - Auto-resolves incoming support tickets upon arrival using the official knowledge base file (`server/knowledge-base.md`).
  - Implements a dedicated ticket state machine using two new enum states (`NEW` and `PROCESSING`):
    - **`NEW`**: The initial status of newly ingested inbound tickets (`POST /api/webhooks/email` or `POST /api/tickets/inbound`).
    - **`PROCESSING`**: Set when the AI background worker is analyzing the ticket and attempting resolution against the knowledge base.
    - **`RESOLVED`**: Set when AI successfully answers the customer inquiry using knowledge base facts and creates an AI reply (`senderType: AI`).
    - **`OPEN`**: Set when AI cannot resolve with high confidence, when customer requires human intervention or escalation (Section 10 rules such as refunds, bugs, billing disputes), or when an error occurs.
  - **Exclusion Rule**: Tickets in `NEW` and `PROCESSING` states are hidden by default from ticket lists (`getAllTickets` / `GET /api/tickets`) and excluded from ticket status counts, so agents never see tickets while AI is actively working on them.
  - Follow-up customer replies to existing tickets still transition the ticket to `OPEN` (and are not auto-resolved).
- **Database & Prisma**:
  - Updated `enum TicketStatus` in `server/prisma/schema.prisma` to include `NEW` and `PROCESSING`, with `@default(NEW)` on `Ticket.status`.
  - Created migration `20260909162000_add_new_and_processing_ticket_statuses` applied to both `helpdesk` and `helpdesk_test` databases.
  - Regenerated Prisma Client v7.10.0.
- **Backend Architecture (`server/src/`)**:
  - `features/tickets/ticket-auto-resolve.service.ts`:
    - `loadKnowledgeBase()`: Caches and reads the markdown knowledge base from `server/knowledge-base.md`.
    - `autoResolveTicket(ticketId)`:
      - Validates ticket exists; skips already `RESOLVED` or `CLOSED` tickets.
      - Transitions status to `TicketStatus.PROCESSING`.
      - Calls GPT-5.6 Luna (`@ai-sdk/openai`) with structured output (`canAutoResolve`, `confidence`, `category`, `priority`, `reasoning`, `reply`).
      - On auto-resolve: creates `TicketReply` with `senderType: ReplySenderType.AI` and marks ticket `RESOLVED`.
      - On cannot resolve or escalation: transitions ticket to `OPEN`.
      - On unexpected AI SDK failure: recovers ticket status to `OPEN` to prevent stuck tickets.
    - `autoResolveTicketAsync(ticketId)`: Non-blocking background dispatch via `pg-boss`.
  - `queue.ts`:
    - Registered queue `ticket-auto-resolve` with `LISTEN/NOTIFY`, retry policy (3 retries, backoff), and worker handler calling `ticketAutoResolveService.autoResolveTicket(ticketId)`.
    - Added `enqueueTicketAutoResolve(ticketId)` helper.
  - `features/tickets/ticket-ingest.service.ts`:
    - Sets `status: TicketStatus.NEW` on newly created inbound tickets.
    - Sets `status: TicketStatus.OPEN` on customer follow-up replies.
  - `features/tickets/ticket.service.ts`:
    - In `getAllTickets`: filters out `NEW` and `PROCESSING` tickets by default (`where.status = { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] }`).
    - In `getTicketCounts`: calculates counts across `OPEN`, `RESOLVED`, `CLOSED` and excludes `NEW` and `PROCESSING` from total.
  - `features/tickets/ticket.controller.ts`:
    - Mounted `autoResolveTicket(req, res)` handling manual `POST /api/tickets/:id/auto-resolve`.
  - `features/tickets/ticket.routes.ts`:
    - Enqueues `ticketAutoResolveService.autoResolveTicketAsync(ticket.id)` on `/email` and `/inbound` arrivals.
    - Mounted `POST /:id/auto-resolve` route with `requireAuth`.
- **Frontend Architecture (`client/src/features/tickets/`)**:
  - `types/index.ts`: Updated `TicketStatus` type union with `"NEW" | "PROCESSING"`.
  - `components/TicketStatusBadge.tsx`: Added badge styling for `NEW` (sky blue) and `PROCESSING` (purple with pulse dot).
  - `components/TicketsTable.tsx`: Excluded `NEW` and `PROCESSING` tickets from table rendering.
  - `components/UpdateTicket.tsx`: Handled `NEW` and `PROCESSING` options in the status select dropdown.
- **Reply Formatting, Tone & Team Signature**:
  - Implemented `formatReplyText` in [`ticket.utils.ts`](server/src/features/tickets/ticket.utils.ts):
    - Addresses customer warmly by first name (`Dear <cust_first_name>,` or fallback `Dear Customer,` derived from `senderName` or email address).
    - Ensures professional, empathetic, and customer-friendly tone throughout.
    - Properly formats reply with clean paragraph breaks (`\n\n`), strips raw markdown headings (`###`), and formats numbered/bulleted lists for instructions.
    - Signs all auto-resolved replies with `HelpDesk Support Team` (`Best regards,\nHelpDesk Support Team`).
- **Testing & Verification**:
  - Authored `ticket-auto-resolve.service.test.ts` (16 comprehensive tests):
    - Knowledge base markdown loading and section verification.
    - State transition `NEW` -> `PROCESSING` -> `RESOLVED` with `senderType: AI` reply creation.
    - State transition `NEW` -> `PROCESSING` -> `OPEN` on non-resolvable / low confidence / escalation questions.
    - Recovery to `OPEN` on AI API errors.
    - Ingestion status verification (`NEW` for new, `OPEN` for follow-ups).
    - Derived customer first name from email when `senderName` is omitted.
    - Proper formatting verification (clean paragraphs, no raw markdown headers, signed with HelpDesk Support Team).
    - Ticket list and counts filtering verification (excluding `NEW` and `PROCESSING`).
    - Manual `POST /api/tickets/:id/auto-resolve` controller endpoint verification.
  - Server Unit Tests (`bun test`): **210 / 210 passed** across 14 test suites.
  - Client Unit Tests (`vitest run`): **149 / 149 passed** across 19 test suites.
  - Production Builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile with 0 errors.
  - **Live Webhook End-to-End Verification**:
    - **Ticket #112** (Answerable via KB: password reset inquiry from Liam Cooper):
      - Created via `POST /api/webhooks/email` -> status `NEW`.
      - Background worker evaluated against KB -> moved to `PROCESSING` -> `RESOLVED`.
      - Posted AI reply addressing Liam by first name (`Dear Liam,`), clear numbered steps, signed with `Best regards,\nHelpDesk Support Team`.
    - **Ticket #113** (Unanswerable via KB: Kubernetes Helm crash on AWS EKS from Maya Lin):
      - Created via `POST /api/webhooks/email` -> status `NEW`.
      - Background worker detected topic not covered in KB (`canAutoResolve: false`) -> escalated to `OPEN`.
      - Classified as `TECHNICAL_QUESTION`, priority `MEDIUM`, 0 AI replies created (waiting for human agent review).

### Milestone 7: AI Agent Seeding & Lifecycle, and Role-Aware Helpdesk Dashboard with 30-Day Volume Chart (Completed)

- **AI Agent Seeding & Assignment Lifecycle**:
  - `server/prisma/seed-ai-agent.ts`: Standalone idempotent script (`bun run prisma:seed:ai`) ensuring the system AI agent (`name: "AI"`, `email: "ai@example.com"`, `role: AGENT`) exists in PostgreSQL.
  - `server/src/features/tickets/ai-agent.utils.ts`: Provides `getOrCreateAiAgent()`, `AI_AGENT_EMAIL`, and `AI_AGENT_NAME`.
  - Inbound ticket assignment: `ticket-ingest.service.ts` assigns inbound tickets to the AI agent on arrival (`status: NEW`).
  - Autonomous resolution assignment preservation & unassignment:
    - If ticket is resolved autonomously: remains assigned to the AI agent with status `RESOLVED`.
    - If auto-resolution fails, requires escalation, encounters errors, or customer replies: status moves to `OPEN` and ticket is unassigned (`assignedToId = null`) so human agents can triage and claim it. Preserves existing manual human assignments.
  - Dedicated unit tests: `server/src/features/tickets/__tests__/ai-agent-assignment.test.ts` (6/6 tests passing).
- **Backend Dashboard Feature (`server/src/features/dashboard/`)**:
  - `dashboard.types.ts`: Comprehensive type definitions (`DailyTicketCount`, `AdminDashboardStats`, `RecentAssignedTicketItem`, `AgentDashboardStats`, `DashboardStatsData`).
  - `dashboard.service.ts`: Implements `formatDuration` (e.g. "1h 15m", "< 1m"), `getDailyTicketCounts(30)` using zero-filled calendar day buckets, and `getDashboardStats(userId, userRole)` with single-pass parallel queries and SQL duration averaging.
  - `dashboard.controller.ts` & `dashboard.routes.ts`: Exposes `GET /api/dashboard/stats` guarded by `requireAuth`.
  - Unit tests: `server/src/features/dashboard/__tests__/dashboard.service.test.ts` (12/12 tests passing).
- **Frontend Dashboard Feature (`client/src/features/dashboard/`)**:
  - Recharts integration (`recharts` v3.10.1).
  - `types/index.ts`: Strict client data types (`AdminStatsData`, `AgentStatsData`, `DailyTicketCount`, `RecentAssignedTicketItem`).
  - `api/dashboard.api.ts` & `hooks/useDashboardStats.ts`: Axios API client and TanStack Query hook with caching and manual refetch.
  - `components/AdminDashboardStats.tsx`: 5 KPI management cards (Total Tickets, Open Tickets, Resolved by AI, % Resolved by AI, Avg Resolution Time) + secondary status breakdown.
  - `components/AgentDashboardStats.tsx`: 4 workload cards (Assigned to Me, My Open, My Resolved, My Closed) + team queue overview bar.
  - `components/TicketVolumeChart.tsx`: Responsive Recharts bar chart rendering 30-day ticket volume with custom tooltip and summary chips (Total in 30 days, Daily average, Peak day).
  - `components/RecentAssignedTicketsTable.tsx`: Table rendering the 10 most recent assigned tickets with customer info, status/priority/category badges, relative date formatting, direct links, and empty states.
  - `pages/DashboardPage.tsx`: Dynamic role-aware orchestrator with administrator tab switcher between Overview and My Workload.
  - `client/src/pages/HomePage.tsx`: Updated to render `<DashboardPage />`.
- **Testing & Verification**:
  - Server unit tests (`bun test`): **228 / 228 passed** across 16 test files.
  - Client component & unit tests (`vitest run`): **168 / 168 passed** across 24 test files (including 5 new suites in `client/src/features/dashboard/__tests__/`).
  - Production builds: Both server (`tsc`) and client (`tsc -b && vite build`) compile cleanly with zero errors.

---

## 7. Current Repository Layout

```text
├── client/                      # React + Vite + TypeScript (Bun)
│   ├── src/
│   │   ├── components/          # Truly shared / application-wide UI
│   │   │   ├── ui/              # shadcn UI components (Base UI primitives)
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   └── skeleton.tsx
│   │   │   ├── AdminRoute.tsx   # Backward-compatibility re-export from features/auth
│   │   │   ├── CreateUserModal.tsx # Backward-compatibility re-export from features/users
│   │   │   ├── EditUserModal.tsx   # Backward-compatibility re-export from features/users
│   │   │   ├── Navbar.tsx       # Global navigation bar with auth awareness
│   │   │   └── ProtectedRoute.tsx # Backward-compatibility re-export from features/auth
│   │   ├── features/            # Feature-based domain modules
│   │   │   ├── auth/            # Authentication feature module
│   │   │   │   ├── components/  # ProtectedRoute, AdminRoute
│   │   │   │   ├── context/     # AuthContext, AuthProvider
│   │   │   │   ├── lib/         # Better Auth client instance
│   │   │   │   ├── pages/       # LoginPage
│   │   │   │   └── index.ts     # Auth barrel export
│   │   │   ├── users/           # User management feature module
│   │   │   │   ├── api/         # users.api.ts (Axios calls: getUsers, createUser, updateUser, deleteUser)
│   │   │   │   ├── components/  # UserStatsCards, UsersFilter, UsersTable, PasswordField, CreateUserModal, EditUserModal, DeleteUserModal
│   │   │   │   ├── hooks/       # useUsers, useCreateUser, useUpdateUser, useDeleteUser
│   │   │   │   ├── pages/       # UsersPage.tsx orchestrator
│   │   │   │   ├── schemas/     # user.schema.ts (DRY Zod schemas)
│   │   │   │   ├── types/       # UserItem, RoleFilter, inputs
│   │   │   │   ├── utils/       # getErrorMessage helper
│   │   │   │   ├── __tests__/   # 7 unit/integration test suites
│   │   │   │   └── index.ts     # Users barrel export
│   │   │   └── tickets/         # Tickets feature module
│   │   │       ├── api/         # tickets.api.ts, __tests__/tickets-ai.api.test.ts
│   │   │       ├── components/  # TicketDetails, UpdateTicket, TicketDetailSkeleton, BackToTicketsButton, TicketRepliesThread, TicketReplyForm, TicketStatusBadge, TicketPriorityBadge, TicketCategoryBadge, TicketStatsCards, TicketsFilter, TicketsTable
│   │   │       ├── hooks/       # useTickets, useTicket, useAssignTicket, useUpdateTicket, useCreateReply, usePolishReply, useSummarizeTicket
│   │   │       ├── pages/       # TicketsPage.tsx, TicketDetailPage.tsx
│   │   │       ├── types/       # TicketItem, TicketFilters, PaginationMeta, etc.
│   │   │       ├── utils/       # date.ts (formatDate helper)
│   │   │       ├── __tests__/   # TicketsTable, TicketsFilter, TicketsPage, TicketDetailPage, TicketDetails, UpdateTicket, TicketDetailSkeleton, BackToTicketsButton, TicketRepliesThread, TicketReplyForm
│   │   │       └── index.ts     # Tickets barrel export
│   │   ├── lib/                 # Shared core utilities (api.ts, query-client.ts, utils.ts)
│   │   ├── pages/               # Cross-cutting root pages & backward-compat re-exports
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   └── TicketDetailPage.tsx
│   │   ├── test/                # Shared test wrappers (renderWithQuery.tsx, setup.ts)
│   │   ├── App.tsx              # Root application router & providers
│   │   ├── index.css            # Tailwind CSS v4 setup + shadcn default theme
│   │   └── main.tsx             # Entry point
│   ├── components.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   └── package.json
│
├── server/                      # Express + TypeScript (Bun)
│   ├── prisma/
│   │   ├── migrations/          # Applied database migrations (including soft delete)
│   │   ├── schema.prisma        # Prisma schema (User with deletedAt)
│   │   ├── seed.ts              # Admin user seed script
│   │   └── seed-tickets.ts      # 100 realistic tickets seed script
│   ├── knowledge-base.md        # Official support knowledge base & escalation rules
│   ├── src/
│   │   ├── config/env.ts        # Environment validator
│   │   ├── queue.ts             # pg-boss job queue (ticket-classification, ticket-auto-resolve)
│   │   ├── features/            # Feature-based domain modules
│   │   │   ├── auth/            # Auth feature: auth.ts, auth.middleware.ts
│   │   │   ├── users/           # Users feature: routes, controller, service, schema, types
│   │   │   └── tickets/         # Tickets feature: routes, controller, services (CRUD, AI polish/summarize, classification, auto-resolve, ingest), schema, types, utils, __tests__ (ticket-ai.controller, ticket-polish.service, ticket.utils, ticket.schema, ticket.service, ticket-ingest.service, ticket-classification.service, ticket-auto-resolve.service)
│   │   ├── middleware/          # Backward-compatibility auth.middleware.ts
│   │   ├── routes/              # Backward-compatibility admin.routes.ts & user.routes.ts
│   │   ├── controllers/         # Backward-compatibility user.controller.ts
│   │   ├── services/            # Backward-compatibility user.service.ts
│   │   ├── prisma.ts            # Shared Prisma client instance
│   │   ├── auth.ts              # Backward-compatibility re-export
│   │   └── index.ts             # Express server connected to PostgreSQL
│   ├── .env
│   ├── .env.test
│   ├── .env.example
│   ├── prisma.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── .agents/
│   ├── agents/
│   │   ├── playwright-e2e/      # Specialized E2E testing subagent
│   │   │   └── agent.md
│   │   └── security-reviewer/   # Application security audit subagent
│   │   │   └── agent.md
│   │   └── skills/
│   │       └── better-auth-best-practices/
│   │           └── SKILL.md
│
├── e2e/                         # Centralized Playwright test suite & test artifacts (Essential journeys only)
│   ├── auth/
│   │   ├── login.spec.ts        # Real browser Better Auth sign-in happy path
│   │   └── session.spec.ts      # Session persistence across reload, sign out, and route guards
│   ├── rbac/
│   │   └── admin-routes.spec.ts # Real browser RBAC: Admin vs Agent access to /users
│   ├── tickets/
│   │   └── ticket-workflow.spec.ts # Inbound webhook -> UI reply -> follow-up email -> thread persistence
│   ├── helpers/
│   │   └── auth.ts              # Test credentials and UI action helpers
│   ├── scripts/
│   │   └── setup-test-db.ts     # Test DB creation, migration & seed manager
│   ├── playwright-report/       # HTML test execution reports (gitignored)
│   └── test-results/            # Failure screenshots & trace videos (gitignored)
├── playwright.config.ts         # Playwright config (outputDir & reporter in e2e/)
├── tsconfig.json                # Root TypeScript workspace configuration
├── .env.test                    # Root test environment variables
├── package.json                 # Root Bun workspaces configuration & test scripts
├── .gitignore                   # Configured with e2e/test-results & reports ignored
├── README.md
├── project-scope.md
├── tech-stack.md
├── implementation-plan.md
└── agy-memory.md                # This project memory file
```


---

## 8. Next Steps

According to `implementation-plan.md`:
* **Phase 3.3 & Phase 4.3**: Knowledge Base (KB) Management (Prisma models, CRUD API, and RAG retrieval matching user queries against KB articles).
* **Phase 4.2 & Phase 5.4**: Autonomous Classification & Response Pipeline (categorizing incoming tickets into General/Technical/Refund, generating grounded auto-replies, and routing sensitive cases to human review).
* **Phase 5**: Inbound & Outbound Email Loop (SendGrid / Mailgun webhook receiver, email thread matching, and automated email dispatch).

