# -----------------------------------------------------------------------------
# Stage 1: Base image with Bun & Debian (includes glibc and OpenSSL for Prisma)
# -----------------------------------------------------------------------------
FROM oven/bun:1-debian AS base

WORKDIR /app

# Install OpenSSL (required by Prisma engines) and CA certificates
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates sed && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Stage 2: Dependencies & Build
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy root lockfile and package.json files for optimal layer caching
COPY package.json bun.lock* ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all workspace dependencies
RUN bun install --frozen-lockfile || bun install

# Copy full monorepo source code
COPY . .

# Generate Prisma client for Linux
RUN bun --cwd server prisma:generate

# Build React frontend SPA (outputs to client/dist)
RUN bun run build:client

# Validate TypeScript compilation for server
RUN bun run build:server

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy root workspace and server manifests
COPY package.json bun.lock* tsconfig.json ./
COPY server/package.json server/tsconfig.json ./server/
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/
COPY server/knowledge-base.md ./server/

# Copy dependencies and generated prisma client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/src ./server/src
COPY --from=builder /app/client/dist ./client/dist

# Expose default HTTP port (Railway injects PORT dynamically at runtime)
EXPOSE 5000

# Copy startup script and ensure LF line endings
COPY start.sh ./
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

CMD ["./start.sh"]
