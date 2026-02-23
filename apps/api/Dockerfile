# =============================================================================
# MaatWork API Dockerfile
# =============================================================================
# Multi-stage build for Railway deployment
# Uses pnpm for monorepo package management
# =============================================================================

# -----------------------------------------------------------------------------
# Base stage: Node.js environment
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

# -----------------------------------------------------------------------------
# Dependencies stage: Install all workspace dependencies
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy package files for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/

# Install dependencies (no frozen lockfile - allows updates)
RUN pnpm install --no-frozen-lockfile

# -----------------------------------------------------------------------------
# Builder stage: Build the API application
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the API package
RUN pnpm --filter @maatwork/api build

# -----------------------------------------------------------------------------
# Runner stage: Production runtime
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 maatwork

# Copy built application and node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Change to non-root user
USER maatwork

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start command
CMD ["node", "apps/api/dist/index.js"]
