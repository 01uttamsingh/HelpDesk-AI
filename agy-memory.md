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

---

## 7. Current Repository Layout

```text
├── client/                      # React + Vite + TypeScript (Bun)
│   ├── src/
│   │   ├── App.tsx              # Starter component with live DB status
│   │   ├── index.css            # Tailwind CSS v4 setup
│   │   └── main.tsx             # Entry point
│   ├── vite.config.ts           # Vite config with API proxy
│   └── package.json
│
├── server/                      # Express + TypeScript (Bun)
│   ├── prisma/
│   │   ├── migrations/          # Applied database migrations
│   │   └── schema.prisma        # Prisma schema
│   ├── src/
│   │   ├── prisma.ts            # Prisma client instance
│   │   └── index.ts             # Express server connected to PostgreSQL
│   ├── .env                     # Configured with local Postgres on port 5433
│   ├── .env.example
│   ├── prisma.config.ts         # Prisma CLI configuration
│   ├── tsconfig.json
│   └── package.json
│
├── package.json                 # Root Bun workspaces configuration
├── .gitignore
├── README.md
├── project-scope.md
├── tech-stack.md
├── implementation-plan.md
└── agy-memory.md                # This project memory file
```

---

## 8. Next Steps

According to `implementation-plan.md`:
* **Phase 2**: Authentication & User Management (Database sessions, password hashing, Admin & Agent roles, seed script).

