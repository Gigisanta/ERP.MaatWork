# DATABASE PACKAGE

**Parent:** `/packages/AGENTS.md`

## OVERVIEW

Drizzle ORM package for PostgreSQL. Provides schema definitions, migrations, and database utilities.

## STRUCTURE

```
packages/db/
├── src/
│   ├── index.ts           # DB instance export
│   ├── schema/            # Domain schemas
│   │   ├── contacts.ts   # Contacts, pipeline, tags
│   │   ├── users.ts      # Users, teams, memberships
│   │   ├── aum.ts        # AUM imports, snapshots
│   │   ├── portfolios.ts  # Templates, lines, assignments
│   │   └── ...
│   ├── migrations/       # Drizzle migrations
│   └── seeds/            # Seed data
├── drizzle.config.ts     # Drizzle config
└── package.json
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add table | `src/schema/[domain].ts` | Follow existing schema patterns |
| Migration | `src/migrations/` | Auto-generated |
| Seed data | `src/seeds/` | Development data |
| DB connection | `src/index.ts` | `db()` function |

## CONVENTIONS

- **Naming**: snake_case for tables and columns
- **IDs**: Use `uuid()` for primary keys
- **Timestamps**: Always include `createdAt`, `updatedAt`
- **Foreign keys**: Use `references()` with `onDelete: 'cascade'`

## COMMANDS

```bash
pnpm -F @maatwork/db generate   # Generate migration
pnpm -F @maatwork/db migrate    # Apply migrations
pnpm -F @maatwork/db seed      # Run seeds
pnpm -F @maatwork/db studio    # Open Drizzle Studio
```

## ANTI-PATTERNS

- Using `push` in production (use migrations)
- Missing indexes on foreign keys
- Not using transactions for multi-table ops

## NOTES

- PostgreSQL 16
- Connection pool managed in `apps/api/src/monitoring/connection-pool.ts`
- Never use `drizzle-kit push` in production
