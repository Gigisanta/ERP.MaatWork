# @maatwork/api

The backend REST API for the MaatWork platform, built with Express.js.

## Key Features

- **Framework**: Express.js with TypeScript.
- **Database**: Drizzle ORM with PostgreSQL.
- **Logging**: Uses `pino` for structured logging.
- **Validation**: Strict Zod validation for all inputs (`src/routes/*`).
- **Authentication**: JWT-based middleware (`src/auth/middlewares.ts`).

## Development Standards

### Logging

Always use `req.log` within routes to maintain request context (requestId).

```typescript
// Good
req.log.info({ contactId }, 'Contact created');

// Bad
console.log('Contact created');
```

### Response Format

All endpoints should follow the standard response envelope:

```typescript
{
  success: boolean;
  data: T;
  error?: string;
  requestId: string;
}
```

Use `createAsyncHandler` to ensure this format and catch errors automatically.

### Database Access

- Use `db()` from `@maatwork/db`.
- Check `src/monitoring/connection-pool.ts` if debugging connection issues.
# railway trigger build 1771946622
