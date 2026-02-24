# API APPLICATION

**Parent:** `/AGENTS.md`

## OVERVIEW

Express.js REST API running on port 3001. Provides CRM endpoints for financial advisors: contacts, portfolios, AUM, teams, tasks, benchmarks, and analytics.

## STRUCTURE

```
apps/api/
├── src/
│   ├── index.ts          # Entry point (port 3001)
│   ├── routes/           # Domain routes (contacts/, teams/, aum/)
│   ├── services/         # Business logic
│   ├── utils/            # Helpers (validation, errors, pagination)
│   └── middleware/       # Auth, logging
└── __tests__/            # Integration + performance tests
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add endpoint | `src/routes/[domain]/` | Follow handler template |
| Validation | `src/utils/validation.ts` | Zod middleware |
| Error handling | `src/utils/route-handler.ts` | Use `createRouteHandler` |
| Auth middleware | `src/middleware/` | JWT validation |
| Pagination | `src/utils/pagination.ts` | `parsePaginationQuery` |

## CONVENTIONS

- **Validation**: Always use `validate({ body/query/params })` middleware
- **Errors**: Use `createRouteHandler` wrapper, never manual try/catch
- **Logging**: Use `req.log` (Pino), never `console.log`
- **DB**: Use transactions for multi-table operations
- **Response format**: `{ success: true, data: ... }` via wrapper

## ANTI-PATTERNS

- Manual `fetch` → use centralized HTTP client
- `ZodError` handling manually → use middleware
- `console.log` in production
- N+1 queries in loops
- Hardcoded timeouts

## NOTES

- Port: 3001
- Auth: JWT via cookies
- DB: PostgreSQL via Drizzle (`@maatwork/db`)
- Test: vitest, 80% coverage threshold
- Start: `pnpm dev:api`
