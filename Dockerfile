FROM node:22-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=@maatwork/api --filter=@maatwork/web
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
COPY apps/api/dist ./dist
COPY apps/api/package.json ./package.json
COPY node_modules ./node_modules
USER nodejs
EXPOSE 3001
CMD ["node", "dist/index.js"]
