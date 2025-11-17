# Test Helpers (Web)

Helpers compartidos para tests de componentes React y páginas.

## Mock Helpers

### `mock-router.tsx`

Factory functions para crear mocks de Next.js router:

```typescript
import { createMockUseRouter, createMockUsePathname } from '../__tests__/helpers/mock-router';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: createMockUseRouter({ push: vi.fn() }),
  usePathname: createMockUsePathname('/dashboard'),
}));
```

### `mock-auth.tsx`

Factory functions para crear mocks de autenticación:

```typescript
import { createMockUseAuth, createMockUser } from '../__tests__/helpers/mock-auth';

// Mock useAuth
vi.mock('../auth/AuthContext', () => ({
  useAuth: createMockUseAuth({
    user: createMockUser({ role: 'admin' }),
  }),
}));
```

## Uso

1. **Tests de componentes**: Usar `mock-router.tsx` y `mock-auth.tsx`
2. **Tests de páginas**: Combinar ambos helpers según necesidad

