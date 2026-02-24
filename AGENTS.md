# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-24
**Commit:** 8455637
**Branch:** feature/railway-migration

## OVERVIEW

TypeScript monorepo with pnpm workspaces + Turbo. Apps: Next.js 15 web (port 3000), Express API (port 3001), Python analytics (port 3002). Shared: db (Drizzle/PostgreSQL), ui (React 19 components), types, utils, logger.

## STRUCTURE

```
./
├── apps/
│   ├── api/                 # Express.js REST API (3001)
│   ├── web/                 # Next.js 15 App Router (3000)
│   └── analytics-service/   # Python FastAPI (3002)
├── packages/
│   ├── db/                  # Drizzle ORM + migrations
│   ├── ui/                  # Design system components
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Utility functions
│   └── logger/              # Pino logging
├── scripts/                 # CLI tools
├── tests/                   # E2E + visual regression
├── docs/                    # Development docs
└── infrastructure/         # Terraform + Docker
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API route | `apps/api/src/routes/` | Follow existing handlers |
| Add web page | `apps/web/app/` | Next.js App Router |
| Add UI component | `packages/ui/src/components/` | Design system |
| DB migration | `packages/db/src/` | Drizzle migrations |
| Write test | Colocate `.test.ts` or `__tests__/` | Per-app vitest config |
| Python analytics | `apps/analytics-service/` | FastAPI + yfinance |

## CODE MAP (Key Symbols)

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `db` | function | `packages/db/src/index.ts` | 50+ | DB instance |
| `createRouteHandler` | function | `apps/api/src/utils/route-handler.ts` | 40+ | Async handler wrapper |
| `validate` | function | `apps/api/src/utils/validation.ts` | 35+ | Zod middleware |
| `apiClient` | class | `apps/web/lib/api-client.ts` | 30+ | HTTP client |
| `Contact` | interface | `packages/types/src/index.ts` | 25+ | Core type |
| `PaginationParams` | interface | `packages/types/src/index.ts` | 20+ | Shared pagination |

## CONVENTIONS (Deviations from standard)

- **ESLint**: `no-explicit-any: error` stricter than default
- **Prettier**: semicolons ON, single quotes, 100 print width
- **Types**: Most configs disable `exactOptionalPropertyTypes` (see AI_DECISION comments)
- **Tests**: Adaptive parallelization - config in `scripts/adaptive-test-config.mjs`
- **Coverage thresholds**: UI 85%, API 80%, Web 70%

## ANTI-PATTERNS (THIS PROJECT)

**Backend:**
- Manual fetch without centralized client
- No input validation (must use Zod)
- `console.log` in production → use `req.log` (Pino)
- N+1 queries in loops → batch queries
- Hardcoded timeouts → centralized config
- Manual ZodError handling → middleware

**Frontend:**
- `window.location` → use `useRouter`
- Native `alert()`/`confirm()` → Toast/Modal
- Manual fetch → use `apiClient`
- Server Components with React hooks

**General:**
- `any` types without justification (tracked for Cleanliness Score)
- Barrel exports (`export *`)
- Magic numbers → constants
- Dead code → run `pnpm audit:code`

## COMMANDS

```bash
# Development
pnpm dev              # All apps (api + web + analytics)
pnpm dev:web          # Next.js only (3000)
pnpm dev:api          # Express only (3001)
pnpm dev:analytics   # Python only (3002)

# Testing
pnpm test             # Unit tests (vitest)
pnpm test:e2e         # Playwright E2E
pnpm test:visual      # Visual regression

# Verification
pnpm typecheck        # TypeScript
pnpm lint             # ESLint
pnpm build            # Turbo build

# Database
pnpm -F @maatwork/db generate  # Generate migration
pnpm -F @maatwork/db migrate  # Apply migration
pnpm -F @maatwork/db seed     # Run seeds

# CLI
pnpm mw <cmd>         # Custom CLI (dev, db, test, gen)
```

## NOTES

- MVP deployment uses SSH + Docker Compose on EC2 (not ECS)
- All `.env` files MUST be gitignored (explicit rule)
- Pre-commit hooks run Knip for dead code detection
- Use `AI_DECISION` comments for architectural choices
- Package build order: db → types → utils/logger → ui → api → web
