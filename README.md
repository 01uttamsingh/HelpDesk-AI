# 🎫 HelpDesk AI — Autonomous Customer Support & Ticket Management System

An intelligent, full-stack enterprise Helpdesk platform powered by **Bun**, **Express**, **React 19**, **TypeScript**, **PostgreSQL**, **Prisma**, **Better Auth**, and **OpenAI**.

---

## 🌐 Live Demo & Deployment

| Resource | URL |
| :--- | :--- |
| **Production App** | [https://helpdesk-ai-production-170e.up.railway.app](https://helpdesk-ai-production-170e.up.railway.app) |
| **API Healthcheck** | [https://helpdesk-ai-production-170e.up.railway.app/api/health](https://helpdesk-ai-production-170e.up.railway.app/api/health) |

### 🔐 Demo Credentials

Use any of the pre-seeded credentials below to test the platform:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@example.com` | `uvdb1357` | Full system access, agent management, analytics & settings |
| **Support Agent** | `agent@example.com` | `uvdb1357` | Ticket triage, replying, assignment, and status updates |
| **AI Agent** | `ai@example.com` | `uvdb1357` | Autonomous AI responder account |

> **Note on DNS**: If your local network or ISP blocks newly created Railway subdomains (`DNS_PROBE_FINISHED_NXDOMAIN`), enable **Secure DNS** (Cloudflare `1.1.1.1` or Google `8.8.8.8`) in Chrome/Edge settings or test via mobile data.

---

## ✨ Key Features

- **🤖 AI Ticket Classification & Triage**: Automatically categorizes incoming inquiries (`Technical Question`, `Refund Request`, `General Question`), calculates priority (`Low`, `Medium`, `High`), and assigns tickets.
- **⚡ AI Auto-Resolution & Response Polishing**: Context-aware draft answers and automated resolutions using company knowledge base embeddings and OpenAI.
- **📧 Bi-Directional Email Integration**: Inbound webhooks parse incoming customer emails; outbound notifications send updates via SMTP/Gmail.
- **🛡️ Modern Authentication**: Secure session and credential-based auth via **Better Auth** with role-based access control (Admin vs. Agent).
- **📊 Real-time Support Analytics**: Interactive resolution metrics, category breakdowns, and ticket lifecycle charts powered by **Recharts**.
- **🔄 Resilient Background Queues**: Asynchronous background jobs, webhook processing, and email delivery using **pg-boss** backed by PostgreSQL.
- **🧪 Comprehensive Test Coverage**: End-to-End browser tests with **Playwright** and unit/component tests with **Vitest**.

---

## 🛠️ Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/) (v1.4+)
- **Frontend**: React 19, Vite, Tailwind CSS v4, TanStack Query v5, TanStack Table, Lucide Icons, Recharts
- **Backend**: Express 4, TypeScript, Prisma ORM 7, Better Auth 1.7, pg-boss
- **Database**: PostgreSQL 16+
- **AI Engine**: OpenAI API (`gpt-4o-mini` / `gpt-4o`) via AI SDK
- **Testing**: Playwright (E2E), Vitest & React Testing Library (Unit/Component)
- **Monitoring & CI/CD**: Sentry, Railway, Docker

---

## 🚀 Local Development Setup

Follow these steps to run the complete HelpDesk AI platform locally on your machine.

### 1. Prerequisites
- **[Bun](https://bun.sh/)** v1.2+ installed globally
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** or a local **PostgreSQL** instance
- **[Node.js](https://nodejs.org/)** v20+ (optional, Bun handles JS/TS execution natively)

---

### 2. Clone the Repository
```bash
git clone https://github.com/singhuttamkumarnavjit-s2/HelpDesk-AI.git
cd HelpDesk-AI
```

---

### 3. Install Dependencies
Install all workspace dependencies across root, server, and client:
```bash
bun install
```

---

### 4. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Review and adjust `.env` with your credentials:
```env
PORT=5000
NODE_ENV=development

# Frontend & Auth URLs
CLIENT_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:5000
TRUSTED_ORIGINS=http://localhost:5173

# PostgreSQL Database (Port 5433 for local Docker, or 5432)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/helpdesk?schema=public

# Session Secret (Generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your_super_secret_better_auth_session_key_min_32_chars

# Seed Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=uvdb1357
ADMIN_NAME=Admin

# OpenAI Key (For AI triage, polishing, and auto-resolution)
OPENAI_API_KEY=sk-proj-your_openai_api_key

# Outbound Email Delivery:
# 1. Google Gmail REST API (Recommended for Railway/production - runs over HTTPS Port 443)
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_google_oauth_refresh_token

# 2. Fallback SMTP / Gmail settings (Standard SMTP ports 465/587, requires Railway Pro or local dev)
EMAIL_PROVIDER=gmail
SUPPORT_EMAIL=support@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

### 5. Start Local PostgreSQL Database

If using Docker:
```bash
docker compose up -d
```
*(Or ensure your local PostgreSQL service is running and matches `DATABASE_URL`)*.

---

### 6. Run Database Migrations & Seed Data

Generate the Prisma client and apply pending migrations:
```bash
bun --cwd server prisma:migrate:deploy
```

Seed initial administrator, agent, and AI accounts:
```bash
bun --cwd server prisma:seed
```

Seed realistic demo tickets (100 sample support requests):
```bash
bun --cwd server prisma:seed:tickets
```

---

### 7. Start the Development Servers

You can start both backend and frontend concurrently with one command:
```bash
bun dev
```

Or start them individually in separate terminals:

**Backend Server**:
```bash
bun dev:server
```
- API Base: `http://localhost:5000`
- Healthcheck: `http://localhost:5000/api/health`

**Frontend Client**:
```bash
bun dev:client
```
- Web Application: `http://localhost:5173`

---

## 🧪 Testing

### Unit & Component Tests (Vitest)
```bash
# Run client unit & component tests
bun test:unit

# Run in watch mode
bun --cwd client test:watch
```

### End-to-End Tests (Playwright)
```bash
# Run headless E2E suite
bun test:e2e

# Run with interactive Playwright UI
bun test:e2e:ui

# Run in headed browser mode
bun test:e2e:headed
```

---

## 📁 Repository Structure

```text
├── client/                     # React 19 + Vite frontend SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Tables, Modals)
│   │   ├── features/           # Feature slices (Tickets, Auth, Analytics, Users)
│   │   ├── hooks/              # Custom React Query & UI hooks
│   │   ├── lib/                # API client & Better Auth client
│   │   └── index.css           # Tailwind CSS v4 styling
│   ├── vite.config.ts          # Vite bundler configuration
│   └── package.json
├── server/                     # Express + Bun TypeScript backend API
│   ├── prisma/
│   │   ├── schema.prisma       # PostgreSQL schema & relations
│   │   ├── seed.ts             # Initial Users seed script
│   │   └── seed-tickets.ts     # Realistic ticket dataset seed script
│   ├── src/
│   │   ├── config/             # Environment, Database, & Auth configuration
│   │   ├── features/           # Backend feature modules (Tickets, AI, Email, Auth)
│   │   ├── middleware/         # Auth guard, error handling, rate limiters
│   │   └── index.ts            # Express application entrypoint
│   └── package.json
├── e2e/                        # Playwright automated test suite
├── Dockerfile                  # Multi-stage production container build
├── railway.toml                # Railway deployment configuration
├── start.sh                    # Container boot, migration & seed runner
├── docker-compose.yml          # Local PostgreSQL services
└── package.json                # Root Bun workspace configuration
```

---

## 📄 License
This project is licensed under the MIT License.
