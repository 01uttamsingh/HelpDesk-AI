# Technology Stack

## Frontend
- **React with TypeScript**: Widely adopted, strong ecosystem for building dashboards and data-heavy UIs.
- **Tailwind CSS v4**: Modern zero-config utility-first styling with `@tailwindcss/vite`.
- **shadcn/ui**: Accessible and customizable component library built on Base UI primitives, Lucide icons, and default `neutral` theme with CSS variables.
- **React Router**: Client-side routing for navigating pages and ticket details.

## Backend
- **Node.js with Express and TypeScript**: Keeps the entire stack in one language, simple to set up REST APIs.
- **Authentication**: Database sessions for secure, revocable user logins.

## Database
- **PostgreSQL**: Relational data (tickets, users, categories) fits naturally into tables with foreign keys; great for filtering and sorting queries.

## ORM
- **Prisma**: Type-safe database access, easy migrations, works seamlessly with TypeScript.

## AI
- **OpenAI (`gpt-5.6-luna`) via Vercel AI SDK (`ai`, `@ai-sdk/openai`)**: Used for ticket classification, conversation summarization, autonomous replies, and draft reply polishing with structured JSON outputs.

## Email
- **SendGrid or Mailgun**: Inbound emails handled via webhooks, outbound replies sent via email API.

## Deployment
- **Docker + Cloud Provider**: Containerized application ready to deploy to Railway, Fly.io, or AWS.
