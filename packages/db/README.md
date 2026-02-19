# @maatwork/db

The core database package containing the Drizzle ORM schema, migrations, and connection logic.

## 📚 Comprehensive Guide

For architecture, optimization strategies, and deep dives, consult the [Comprehensive Database Guide](../../docs/DATABASE.md).

## Usage

### Schema Definition

Schema is defined in `src/schema.ts`. To make changes:

1. Edit `src/schema.ts` (or files in `src/schema/`).
2. Run migration generation.

### Commands

This package is managed via Turbo but has local scripts:

```bash
# Generate migrations from schema changes
pnpm generate

# Apply migrations to the local database
pnpm migrate

# Seed the database
pnpm seed:all

# Launch Drizzle Studio
pnpm studio
```

### Connection

The connection pool is exported from `src/index.ts`. It is pre-configured with optimized pool settings (see `docs/DATABASE.md` for details).

```typescript
import { db } from '@maatwork/db';

const users = await db().query.users.findMany();
```

## Maintenance

- **Migrations**: Stored in `migrations/`. Do not edit SQL files manually unless necessary.
- **Seeds**: Located in `src/seeds/`. Idempotent by design.
