# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

# Copy pnpm-lock.yaml and install dependencies
COPY pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile --prod=false

# ============================================================
# Stage 2: Build
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ============================================================
# Stage 3: Runner
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
