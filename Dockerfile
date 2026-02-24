# Root Dockerfile for Railway deployment
# Simplified single-stage build for reliability

FROM node:22-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

# Copy all necessary files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY scripts ./scripts

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Build the API and Web apps
RUN pnpm run build --filter=@maatwork/api --filter=@maatwork/web

# Production configuration
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs

# Copy only what's needed for running the API
COPY apps/api/dist ./dist
COPY apps/api/package.json ./package.json
COPY node_modules ./node_modules

USER nodejs
COPY apps/api/dist ./dist
COPY apps/api/package.json ./package.json
COPY node_modules ./node_modules
COPY --from=0 /app/apps/api/dist ./dist
COPY --from=0 /app/apps/api/package.json ./package.json
COPY --from=0 /app/node_modules ./node_modules

USER nodejs
EXPOSE 3001
CMD ["node", "dist/index.js"]
