# Coding Standards & Agent Guidelines

This document serves as the authoritative guide for coding standards, patterns, and best practices within the MAATWORK monorepo. It is designed to be consumed by both human developers and AI agents to ensure consistency, reliability, and maintainability.

## 1. Core Principles

- **Strict Typing**: No `any` allowed. Use `unknown` with type guards if necessary.
- **Structured Logging**: No `console.log` or `console.error`. Use the provided `logger` instances.
- **Centralized Logic**: Business logic belongs in `apps/api` services or shared packages, not in UI components.
- **Optimistic UI**: Use optimistic updates for all mutation hooks in `apps/web`.

## 2. API & Backend (`apps/api`)

### API Logging

All logging must use the `pino` instance injected into the request or the global logger.

```typescript
// ✅ CORRECT
req.log.info({ userId: user.id }, 'Action completed');
logger.error({ err }, 'System failure');

// ❌ INCORRECT
console.log('Action completed');
console.error(err);
```

### Type Safety

- **Request/Response**: All inputs must be validated with Zod schemas.
- **Database**: Use Drizzle ORM types. Avoid raw SQL where possible.
- **Async Handling**: Use `createAsyncHandler` to wrap routes for consistent error handling.
- **No Explicit Any**: If you find yourself using `as any`, stop and define the interface.

### Services

- **Email Service**: Use typed configurations (`AutomationEmailConfig`) in `email-service.ts`.
- **Database Connection**: Access the pool via safe helpers in `connection-pool.ts`.

## 3. Frontend (`apps/web`)

### Frontend Logging

Use the globally available `logger` from `@maatwork/logger` (or the internal alias).

```typescript
import { logger } from 'lib/logger';

// ✅ CORRECT
logger.debug('Component mounted', { props });

// ❌ INCORRECT
console.log('Component mounted');
```

### Data Fetching & Mutations

- **Hooks**: Use `useEntityWithComponents` for standard CRUD operations.
- **Optimistic Updates**: Implement optimistic updates in hooks to ensure immediate UI feedback.
- **Tree Shaking**: Import specific API functions from `lib/api` instead of specific files if possible, or use named imports to encourage tree shaking.

## 4. Design System (`@maatwork/ui`)

- **Imports**: Import components directly from `@maatwork/ui`.
- **Tokens**: Use exported `tokens` and `brandColors` for styling consistency.
- **Animations**: Use `PageContent`, `StaggeredSection`, and `PageHeader` from `PageTransition` for consistent page entrances.

## 5. Repository Maintenance

- **Linting**: Run `pnpm lint` before pushing. Zero tolerance for new lint errors.
- **Testing**: Tests must be co-located or in `tests/` folders.
- **Cleanliness**: Remove unused variables, imports, and dead code immediately.
