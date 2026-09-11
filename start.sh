#!/bin/sh
set -e

echo "🚀 [Railway] Running pending Prisma database migrations..."
bun run --cwd server prisma:migrate:deploy

echo "🌱 [Railway] Seeding initial database records (Admin, Agent, AI Agent)..."
bun run --cwd server prisma:seed

echo "🚀 [Railway] Starting Helpdesk server on port ${PORT:-5000}..."
exec bun run --cwd server start
