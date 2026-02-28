# SHARED PACKAGES

**Parent:** `/AGENTS.md`

## OVERVIEW

Shared packages used across monorepo apps. Must be built before consuming apps.

## PACKAGES

| Package | Location | Purpose |
|---------|----------|---------|
| `@maatwork/db` | `packages/db/` | Drizzle ORM, PostgreSQL schemas, migrations |
| `@maatwork/ui` | `packages/ui/` | React 19 Design System components |
| `@maatwork/types` | `packages/types/` | Shared TypeScript interfaces |
| `@maatwork/utils` | `packages/utils/` | Utility functions |
| `@maatwork/logger` | `packages/logger/` | Pino logging wrapper |

## WHERE TO LOOK

| Need | Package |
|------|---------|
| DB schema/migration | `packages/db/src/schema/` |
| UI component | `packages/ui/src/components/[category]/` |
| Shared types | `packages/types/src/` |
| Logger setup | `packages/logger/src/index.ts` |

## CONVENTIONS

- **Build required**: Packages must be built (`pnpm build`) before apps can use them
- **Exports**: Barrel exports via `index.ts` in each package
- **Types**: Avoid `any`, use existing shared types

## NOTES

- **Order matters**: `packages/db` → `packages/types` → other packages → `apps/api` → `apps/web`
- **DB needs migration**: After schema changes, run `pnpm -F @maatwork/db generate` then `migrate`
- **UI needs build**: After component changes, run `pnpm -F @maatwork/ui build`
- Coverage: UI 85%, others via app configs
