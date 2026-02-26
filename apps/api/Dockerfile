# Dockerfile for API service
# Build from monorepo root to access shared packages

FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files from root
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/logger/package.json ./packages/logger/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install dependencies - NO frozen-lockfile
RUN pnpm install --no-frozen-lockfile

# Build shared packages
RUN pnpm -F @maatwork/types build && \
    pnpm -F @maatwork/utils build && \
    pnpm -F @maatwork/logger build && \
    pnpm -F @maatwork/db build && \
    pnpm -F @maatwork/api build

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api

# Expose port
EXPOSE 3001

# Start command
CMD ["node", "/app/apps/api/dist/index.js"]
FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/logger/package.json ./packages/logger/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --recursive

# Build dependencies
RUN pnpm -F @maatwork/types build && \
    pnpm -F @maatwork/utils build && \
    pnpm -F @maatwork/logger build && \
    pnpm -F @maatwork/db build && \
    pnpm -F @maatwork/api build

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api

# Expose port
EXPOSE 3001

# Start command
CMD ["pnpm", "-F", "@maatwork/api", "start"]
