# AI-Powered Ticket Management System

Autonomous AI helpdesk system built with **Bun**, **Express**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **PostgreSQL**, **Prisma**, and **Google Gemini API**.

---

## Project Structure

```text
├── client/              # React + Vite + Tailwind CSS frontend SPA
│   ├── src/
│   │   ├── App.tsx      # Main dashboard & ticket UI
│   │   └── index.css    # Tailwind CSS v4 entry
│   ├── vite.config.ts   # Vite bundler config with API proxy
│   └── package.json
├── server/              # Express + TypeScript backend API
│   ├── prisma/
│   │   └── schema.prisma # PostgreSQL data models (User, Ticket, Message, etc.)
│   ├── src/
│   │   └── index.ts     # Express server entry point
│   ├── .env.example
│   └── package.json
├── docker-compose.yml   # PostgreSQL + pgvector container definition
├── package.json         # Root Bun workspaces configuration
├── project-scope.md     # Project requirements & feature scope
├── tech-stack.md        # Technology stack breakdown
└── implementation-plan.md # Development phases and task checklist
```

---

## Quick Start

### 1. Prerequisites
- **Bun** (v1.4+) installed globally
- **Docker Desktop** (for PostgreSQL)

### 2. Start PostgreSQL Database
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
# In the root directory
bun install
```

### 4. Run the Application

#### Start Backend Server:
```bash
bun dev:server
```
Backend API will be live at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

#### Start Frontend Client (in a separate terminal):
```bash
bun dev:client
```
Frontend UI will be live at: `http://localhost:5173`
