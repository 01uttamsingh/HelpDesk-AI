# Implementation Plan: AI-Powered Ticket Management System

This plan breaks down the development of the autonomous AI helpdesk into discrete, sequential phases and actionable tasks.

---

## Phase 1: Project Setup & Core Infrastructure

- [ ] **1.1 Workspace & Repository Structure**
  - Initialize root project directory with client and server structure (`/client`, `/server`).
  - Configure root scripts and `.gitignore`.
- [ ] **1.2 Backend Foundation (Node.js + Express + TypeScript)**
  - Initialize Node.js project with TypeScript, `tsconfig.json`, `ts-node-dev`, and ESLint.
  - Setup Express server with standard middleware (`cors`, `helmet`, `express.json()`, `express.urlencoded()`).
- [ ] **1.3 Frontend Foundation (React + Vite + TypeScript)**
  - Initialize Vite React + TypeScript project in `/client`.
- [ ] **1.4 Database & Docker Setup**
  - Setup postgreSQL database
  

---

## Phase 2: Authentication & User Management

- [ ] **2.1 Session-Based Authentication Backend**
  - Configure `express-session` with `connect-pg-simple` backed by PostgreSQL.
  - Implement password hashing with `bcrypt`.
  - Create auth routes: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
  - Create authentication middleware (`requireAuth`) and role authorization middleware (`requireAdmin`).
- [ ] **2.2 Database Seeding**
  - Create seed script (`prisma/seed.ts`) to initialize default categories (`General Question`, `Technical Questions`, `Refund request`) and initial Admin account.
- [ ] **2.3 Admin User Management API**
  - `GET /api/admin/users`: List all agents and admins.
  - `POST /api/admin/users`: Create a new Agent account (Admin only).
  - `PATCH /api/admin/users/:id`: Activate/Deactivate or update role.
- [ ] **2.4 Frontend Auth State & Login View**
  - Build AuthContext in React to manage current user session.
  - Create Login page (`/login`) with error handling.
  - Create Protected Route wrappers for authenticated users and Admin-only routes.

---

## Phase 3: Ticket Data Model & Core REST API

- [ ] **3.1 Ticket CRUD & Query Endpoints**
  - `GET /api/tickets`: List tickets with pagination, filtering (status, category, assigned agent), and sorting (newest, priority).
  - `GET /api/tickets/:id`: Retrieve single ticket with full message history, category, and metadata.
  - `PATCH /api/tickets/:id`: Update ticket status (`Open`, `Resolved`, `Closed`), category, or assigned agent.
- [ ] **3.2 Message & Reply Endpoints**
  - `POST /api/tickets/:id/messages`: Allow an agent to post a manual response or internal note.
  - Automatically update ticket status and timestamps upon message submission.
- [ ] **3.3 Knowledge Base CRUD API**
  - `GET /api/kb`: List all knowledge base articles.
  - `POST /api/kb`: Create an article (Admin only).
  - `PUT /api/kb/:id` & `DELETE /api/kb/:id`: Update/delete articles.

---

## Phase 4: AI Engine Integration (Google Gemini API)

- [ ] **4.1 Gemini API Client Setup**
  - Install `@google/genai` or `@google/generative-ai`.
  - Configure Gemini client with API key from environment variables.
- [ ] **4.2 Ticket Classification Service**
  - Prompt Gemini with structured JSON output to analyze email subject/body:
    - Predict Category: `General Question`, `Technical Questions`, `Refund request`.
    - Detect Urgency/Priority: `Low`, `Medium`, `High`.
- [ ] **4.3 Knowledge Base Retrieval (RAG)**
  - Implement retrieval mechanism to match ticket query with relevant knowledge base items.
  - Format relevant articles as contextual prompt inputs for Gemini.
- [ ] **4.4 Autonomous Response Generation**
  - Prompt Gemini to generate human-friendly, accurate replies using retrieved knowledge base context.
  - Include guardrails: Detect if information is unavailable, and draft an escalation message instead of hallucinating.
- [ ] **4.5 Thread Summarization Service**
  - Implement a helper to generate a concise 2–3 sentence summary of the conversation thread for agents.

---

## Phase 5: Inbound & Outbound Email Loop

- [ ] **5.1 Email Provider Setup (SendGrid or Mailgun)**
  - Configure email provider credentials (API Key, sending domain, webhook signing secret).
  - Create outbound email service helper (`sendEmail({ to, subject, body, inReplyTo, references })`).
- [ ] **5.2 Inbound Email Webhook**
  - Implement `POST /api/webhooks/email` endpoint to receive incoming webhooks.
  - Parse sender email, name, subject, plain text body, and email message headers.
- [ ] **5.3 Thread Matching & Ticket Ingestion**
  - Check `In-Reply-To` / `References` headers or subject tokens (`[Ticket #ID]`) to determine if email belongs to an existing ticket.
  - If existing ticket: Append incoming message, update status to `Open`.
  - If new: Create a new ticket and initial message.
- [ ] **5.4 Autonomous Response Pipeline**
  - Trigger Gemini classification on new tickets.
  - For `General` and `Technical` categories: Run RAG retrieval, generate answer, auto-send reply email via provider, append AI message to ticket, and mark status as `Resolved` or `Waiting on Customer`.
  - For `Refund request` category: Flag for human agent/admin review, do not auto-send a refund commitment.
  - Add loop detection (ignore automated bounce and "out-of-office" emails).

---

## Phase 6: Frontend Agent Dashboard & UI

- [ ] **6.1 App Shell & Navigation**
  - Build responsive sidebar/header with user profile, logout, and navigation links.
- [ ] **6.2 Ticket List / Dashboard Page (`/tickets`)**
  - Build data table with ticket subject, student email, category badge, status badge, and date.
  - Implement filters: Status filter tabs (`All`, `Open`, `Resolved`, `Closed`), Category dropdown, and search bar.
  - Implement sorting by creation date.
- [ ] **6.3 Ticket Detail View (`/tickets/:id`)**
  - Display ticket header: Student email, category selector, status toggle.
  - Conversation feed: Chronological messages displaying incoming student emails, autonomous AI replies, and agent notes with distinct styling.
  - AI Summary card displaying thread overview.
  - Manual Reply / Note composer with Send button.
- [ ] **6.4 Knowledge Base Management Page (`/kb`)**
  - View list of knowledge base articles.
  - Modal/Form to add, edit, or remove articles.
- [ ] **6.5 Admin User Management Page (`/admin/users`)**
  - Agent list table with active/inactive status.
  - "Invite / Add Agent" modal form.

---

## Phase 7: Testing, Polish & Containerization

- [ ] **7.1 End-to-End Workflow Testing**
  - Test simulated inbound email webhook -> ticket creation -> Gemini auto-reply -> outbound email sent.
  - Test agent manual takeover and status transitions.
- [ ] **7.2 Error Handling & Resiliency**
  - Add global error handler in Express.
  - Handle Gemini rate limits or API downtime gracefully (fallback to human queue).
- [ ] **7.3 Docker Containerization**
  - Create production `Dockerfile` for backend server.
  - Create production `Dockerfile` for frontend with Nginx.
  - Finalize `docker-compose.yml` for running Postgres, Server, and Client with one command.
- [ ] **7.4 Documentation & README**
  - Document setup steps, environment variables, seeding, and webhook testing with ngrok/localtunnel.
