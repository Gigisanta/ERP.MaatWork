# Drizzle ORM Mock Helper - Guía de Uso

## Problema que resuelve

Los tests de rutas que usan Drizzle ORM tienen problemas consistentes con los mocks:
- `db()` retorna `undefined` cuando el handler llama a `db()`
- Los mocks de `execute()` no funcionan correctamente
- Los mocks de `select().from().where().limit()` son complejos y propensos a errores

## Solución

El helper `createDrizzleMock()` proporciona una forma robusta y reutilizable de crear mocks de Drizzle ORM.

## Uso Básico

```typescript
import { createDrizzleMock } from '@/__tests__/helpers/drizzle-mocks';
import { db } from '@cactus/db';

const mockDb = vi.mocked(db);

describe('My Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar mock por defecto
    const defaultMock = createDrizzleMock();
    mockDb.mockReturnValue(defaultMock.getInstance());
  });

  it('should work', async () => {
    // Configurar respuestas específicas para este test
    const drizzleMock = createDrizzleMock({
      executeResponses: [
        { rows: [{ total: '10' }] }, // Primera llamada a execute()
        { rows: [{ id: '1' }] },    // Segunda llamada a execute()
      ],
    });

    mockDb.mockReturnValue(drizzleMock.getInstance());
    
    // ... resto del test
  });
});
```

## Casos de Uso Comunes

### 1. Mock de `db().execute()` con SQL templates

```typescript
const drizzleMock = createDrizzleMock({
  executeResponses: [
    { rows: [{ total: '10' }] },      // Primera llamada
    { rows: [{ id: '1', name: 'Test' }] }, // Segunda llamada
  ],
});

mockDb.mockReturnValue(drizzleMock.getInstance());
```

### 2. Mock de `db().select().from().where().limit()`

```typescript
const drizzleMock = createDrizzleMock({
  selectResponses: [
    { limitData: [] },              // Primera llamada a select()
    { limitData: [{ id: '1' }] },  // Segunda llamada a select()
  ],
});

mockDb.mockReturnValue(drizzleMock.getInstance());
```

### 3. Mock de `db().insert().values()`

```typescript
const drizzleMock = createDrizzleMock({
  insertResponse: {
    valuesResponse: undefined, // Retorna undefined para éxito
  },
});

mockDb.mockReturnValue(drizzleMock.getInstance());
```

### 4. Mock de `db().update().set().where()`

```typescript
const drizzleMock = createDrizzleMock({
  updateResponse: {
    whereResponse: undefined, // Retorna undefined para éxito
  },
});

mockDb.mockReturnValue(drizzleMock.getInstance());
```

### 5. Combinación de múltiples operaciones

```typescript
const drizzleMock = createDrizzleMock({
  selectResponses: [
    { limitData: [] }, // select para verificar existencia
  ],
  executeResponses: [
    { rows: [{ total: '5' }] }, // execute para COUNT
  ],
  insertResponse: {
    valuesResponse: undefined,
  },
});

mockDb.mockReturnValue(drizzleMock.getInstance());
```

## API Completa

### `createDrizzleMock(config?)`

Crea un nuevo mock de Drizzle ORM con la configuración especificada.

**Parámetros:**
- `config.selectResponses`: Array de respuestas para `select()` (por orden de llamada)
- `config.executeResponses`: Array de respuestas para `execute()` (por orden de llamada)
- `config.insertResponse`: Configuración para `insert().values()`
- `config.updateResponse`: Configuración para `update().set().where()`
- `config.deleteResponse`: Configuración para `delete().where()`

**Retorna:** Instancia de `DrizzleMock`

### `DrizzleMock` - Métodos

- `setSelectResponse(response)`: Agrega una respuesta para la próxima llamada a `select()`
- `setExecuteResponse(response)`: Agrega una respuesta para la próxima llamada a `execute()`
- `setInsertResponse(response)`: Configura respuesta para `insert().values()`
- `setUpdateResponse(response)`: Configura respuesta para `update().set().where()`
- `setDeleteResponse(response)`: Configura respuesta para `delete().where()`
- `reset()`: Resetea los contadores de llamadas
- `getInstance()`: Obtiene la instancia mock lista para usar con `mockDb.mockReturnValue()`

## Notas Importantes

1. **Siempre configura el mock ANTES de crear la app de test:**
   ```typescript
   // ✅ CORRECTO
   const drizzleMock = createDrizzleMock({ ... });
   mockDb.mockReturnValue(drizzleMock.getInstance());
   const app = createTestAppWithRoutes();
   
   // ❌ INCORRECTO
   const app = createTestAppWithRoutes();
   mockDb.mockReturnValue(drizzleMock.getInstance()); // Muy tarde!
   ```

2. **Usa `vi.clearAllMocks()` en `beforeEach` pero luego configura el mock:**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
     const defaultMock = createDrizzleMock();
     mockDb.mockReturnValue(defaultMock.getInstance());
   });
   ```

3. **Para múltiples llamadas, configura todas las respuestas en orden:**
   ```typescript
   const drizzleMock = createDrizzleMock({
     executeResponses: [
       { rows: [...] }, // Primera llamada
       { rows: [...] }, // Segunda llamada
       { rows: [...] }, // Tercera llamada
     ],
   });
   ```

4. **Los valores de `total` en SQL COUNT vienen como string:**
   ```typescript
   executeResponses: [
     { rows: [{ total: '10' }] }, // ✅ String
     // NO { rows: [{ total: 10 }] }, // ❌ Number
   ],
   ```

