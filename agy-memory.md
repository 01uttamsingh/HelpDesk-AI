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
| **Backend** | **Node.js + Express + TypeScript** | REST API in `/server`, executed via `bun --watch src/index.ts`. |
| **Authentication** | **Database Sessions** | **Better Auth** (email/password, database sessions via Prisma adapter backed by PostgreSQL). |
| **Database** | **PostgreSQL 18** | Local PostgreSQL on port 5433 (`helpdesk` database). |
| **ORM** | **Prisma ORM (v7+)** | Type-safe queries with driver adapters (`@prisma/adapter-pg`) and declarative migrations (`prisma.config.ts` & `prisma/schema.prisma`). |
| **AI / LLM** | **Google Gemini API** (`@google/genai`) | Classification, summaries, text embeddings, and autonomous replies. |
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
- **Environment Isolation**:
  - Created `server/.env.test` and root `.env.test` targeting `helpdesk_test` on test ports (Backend: 5001, Frontend: 5174).
  - Configured `server/src/config/env.ts`, `server/src/prisma.ts`, and `server/prisma/seed.ts` to load `.env.test` with `override: true` when `NODE_ENV === "test"`.
  - Updated `client/vite.config.ts` to allow dynamic port and proxy target overrides via `PORT` / `VITE_PORT` and `API_URL` / `VITE_API_URL`.
- **Production-Only Rate Limiting**: Scoped both Express `express-rate-limit` and Better Auth internal `rateLimit` to `NODE_ENV === "production"`.
- **Playwright Configuration**: Created `playwright.config.ts` with dual `webServer` orchestration (server on port 5001 with test db, client on port 5174), single worker for database isolation, and failure artifact captures.
- **Package Scripts**: Added `db:test:setup`, `db:test:reset`, `test:server`, `test:client`, `test:e2e`, `test:e2e:ui`, and `test:e2e:headed` scripts in root `package.json`.
- **Strict Compliance**: No test specs written per prompt instruction; verified clean configuration and dual webServer launch.

---

## 7. Current Repository Layout

```text
├── client/                      # React + Vite + TypeScript (Bun)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn UI components (Base UI primitives)
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   └── separator.tsx
│   │   │   ├── AdminRoute.tsx   # Admin-only route guard
│   │   │   ├── Navbar.tsx       # Navigation bar with role-aware nav & sign out
│   │   │   └── ProtectedRoute.tsx # Route protection with role checks & login redirect
│   │   ├── context/
│   │   │   ├── AuthContext.ts   # Session context & useSession hook
│   │   │   └── AuthProvider.tsx # Session provider fetching from DB
│   │   ├── lib/
│   │   │   ├── auth-client.ts   # Better Auth client instance
│   │   │   └── utils.ts         # shadcn cn utility function
│   │   ├── pages/
│   │   │   ├── HomePage.tsx     # Welcome dashboard & health status
│   │   │   ├── LoginPage.tsx    # Sign-in form styled with shadcn components
│   │   │   └── UsersPage.tsx    # Admin users page with heading
│   │   ├── App.tsx              # Main App layout, ProtectedRoute & Router
│   │   ├── index.css            # Tailwind CSS v4 setup + shadcn default theme
│   │   └── main.tsx             # Entry point
│   ├── components.json          # shadcn configuration (base-nova, neutral)
│   ├── vite.config.ts           # Vite config with @ alias, configurable test port & proxy
│   ├── tsconfig.app.json        # TS app config with @/* path alias
│   ├── tsconfig.json
│   └── package.json
│
├── server/                      # Express + TypeScript (Bun)
│   ├── prisma/
│   │   ├── migrations/          # Applied database migrations
│   │   ├── schema.prisma        # Prisma schema
│   │   └── seed.ts              # Admin user seed script (supports test db)
│   ├── scripts/
│   │   └── setup-test-db.ts     # Test DB creation, migration & seed manager
│   ├── src/
│   │   ├── auth.ts              # Better Auth server configuration
│   │   ├── prisma.ts            # Prisma client instance (supports test db)
│   │   ├── config/env.ts        # Environment validator (supports test env)
│   │   └── index.ts             # Express server connected to PostgreSQL
│   ├── .env                     # Local Postgres on port 5433 (helpdesk)
│   ├── .env.test                # Local Postgres on port 5433 (helpdesk_test)
│   ├── .env.example
│   ├── prisma.config.ts         # Prisma CLI configuration
│   ├── tsconfig.json
│   └── package.json
│
├── e2e/                         # Playwright E2E test specs (ready for tests)
├── playwright.config.ts         # Playwright test configuration & webServer orchestration
├── .env.test                    # Root test environment variables
├── package.json                 # Root Bun workspaces configuration & test scripts
├── .gitignore                   # Configured with Playwright test-results & reports ignored
├── README.md
├── project-scope.md
├── tech-stack.md
├── implementation-plan.md
└── agy-memory.md                # This project memory file
```

---

## 8. Next Steps

According to `implementation-plan.md`:
* **Phase 3**: Ticket Management & Ingestion (Prisma schema relations, CRUD endpoints, email webhook ingest).

