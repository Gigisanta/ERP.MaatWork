# @maatwork/web

The frontend application built with Next.js 14+ (App Router).

## Architecture

- **State Management**: React Context (`AuthContext`) + SWR (data fetching).
- **Styling**: Tailwind CSS with generic `tokens` from `@maatwork/ui`.
- **Forms**: React Hook Form + Zod resolvers.

## Key Directories

- `app/`: Next.js App Router pages and layouts.
- `lib/api/`: Typed API clients. **Do not use `fetch` directly in components.**
- `components/`: Local components (business specific). Generic components belong in `@maatwork/ui`.

## Development Standards

### Logging

Use the global logger instance.

```typescript
import { logger } from 'lib/logger';
logger.info('User action', { meta: 'data' });
```

### Optimistic Updates

All mutation hooks (e.g., `usePortfolios`, `useContacts`) must implement optimistic updates to ensure a snappy user experience. See `useEntityWithComponents` for the standard implementation pattern.

### Components

- Prefer functional components.
- Use `PageTransition` components for page layouts to ensure smooth navigation.
