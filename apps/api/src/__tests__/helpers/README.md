# Test Helpers

Helpers compartidos para tests unitarios e integración.

## Mock Helpers

### `mock-db.ts`

Factory functions para crear mocks de `@cactus/db`:

```typescript
import { createMockDbWithResponses } from '../__tests__/helpers/mock-db';

// Crear mock con respuestas específicas
const mockDb = createMockDbWithResponses({
  select: {
    users: [{ id: '1', email: 'test@test.com' }]
  }
});

vi.mocked(db).mockReturnValue(mockDb());
```

### `mock-auth.ts`

Factory functions para crear mocks de autenticación:

```typescript
import { createMockAuthenticatedRequest, createMockUser } from '../__tests__/helpers/mock-auth';

// Crear request autenticado
const mockReq = createMockAuthenticatedRequest(
  createMockUser({ role: 'admin' })
);
```

### `test-db.ts`

Helpers para tests de integración con base de datos real:

```typescript
import { getTestDb, withTransaction } from '../__tests__/helpers/test-db';

// Usar DB real en test
const db = getTestDb();
const users = await db.select().from(users);

// Usar transacción con rollback automático
await withTransaction(async (db) => {
  // Modificaciones aquí se revierten automáticamente
});
```

## Uso

1. **Tests unitarios**: Usar `mock-db.ts` y `mock-auth.ts`
2. **Tests de integración**: Usar `test-db.ts` con DB real

