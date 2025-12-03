# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy package.json files for all workspaces
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

# Install dependencies (disable husky - no git in container)
ENV HUSKY=0
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY apps/api ./apps/api
COPY packages/db ./packages/db

# Build packages/db first (dependency)
WORKDIR /app/packages/db
RUN pnpm build

# Build API
WORKDIR /app/apps/api
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

# Install production dependencies only (disable husky)
ENV HUSKY=0
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

WORKDIR /app/apps/api

CMD ["node", "dist/index.js"]
