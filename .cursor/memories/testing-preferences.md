# Memoria: Preferencias de Testing

## Propósito
Estándares y preferencias de testing específicas del proyecto MAATWORK para mantener calidad y consistencia en los tests.

## Contexto
Usar esta memoria cuando:
- Escribir nuevos tests
- Revisar tests existentes
- Decidir estructura y estilo de tests
- Necesitar guía de mocking y coverage

## Framework Stack

### Herramientas por Tipo de Test
- ✅ **Vitest** para unit tests (NO Jest)
- ✅ **Playwright** para E2E tests
- ✅ **Testing Library** para componentes React

**Razón:** Vitest es más rápido y compatible con Vite, Playwright es estándar para E2E, Testing Library promueve mejores prácticas.

## Ubicación de Tests

### Apps (api/web)
- **Unit tests**: `src/**/*.test.ts` (mismo directorio que el archivo)
- **E2E tests**: `tests/e2e/[feature].spec.ts` (raíz del monorepo)

### Packages
- **@maatwork/ui**: `src/**/*.test.tsx` (co-ubicados con componentes)
- **@maatwork/db**: Sin tests unit (validación vía migraciones y seeds)

**Ejemplo de estructura:**
```
apps/api/src/routes/contacts.ts
apps/api/src/routes/contacts.test.ts  # Co-ubicado

packages/ui/src/components/Button/Button.tsx
packages/ui/src/components/Button/Button.test.tsx  # Co-ubicado

tests/e2e/contacts-workflow.spec.ts  # E2E en raíz
```

## Coverage Targets

### Por Workspace
- **Backend (api)**: 100% (lines, functions, branches, statements)
- **Frontend (web)**: 100% (lines, functions, branches, statements)
- **UI Package**: 100% (lines, functions, branches, statements)

**Razón:** Cobertura completa asegura que todos los caminos de código están probados y reduce bugs en producción.

## Estructura de Tests

### Patrón Arrange-Act-Assert (AAA)

```typescript
describe('FeatureName', () => {
  it('should do something specific', () => {
    // Arrange - Setup
    const input = { name: 'Test', email: 'test@example.com' };
    const expected = { id: '123', ...input };
    
    // Act - Execute
    const result = functionUnderTest(input);
    
    // Assert - Verify
    expect(result).toEqual(expected);
  });
});
```

### Estilo de Nombres de Tests

**Formato:** `should [acción] when [condición]`

```typescript
// ✅ BIEN - Descriptivo y específico
it('should return 400 when email is invalid', () => { ... });
it('should create contact when data is valid', () => { ... });
it('should throw error when user is not authenticated', () => { ... });

// ❌ MAL - Vago
it('works', () => { ... });
it('test contact', () => { ... });
```

### Agrupación con describe

```typescript
describe('createContact', () => {
  describe('when data is valid', () => {
    it('should create contact successfully', () => { ... });
    it('should return contact with id', () => { ... });
  });
  
  describe('when data is invalid', () => {
    it('should return 400 for invalid email', () => { ... });
    it('should return 400 for missing name', () => { ... });
  });
  
  describe('when user is not authenticated', () => {
    it('should return 401', () => { ... });
  });
});
```

## Mocking

### Principios de Mocking

**Preferir mocks realistas** sobre mocks triviales:

```typescript
// ✅ BIEN - Mock realista
vi.mock('@/lib/api', () => ({
  createContact: vi.fn().mockResolvedValue({
    id: '123',
    name: 'Test',
    email: 'test@example.com',
  }),
}));

// ⚠️ Evitar - Mock trivial
vi.mock('@/lib/api', () => ({
  createContact: vi.fn().mockResolvedValue({}),
}));
```

### Mockear Dependencias Externas, No Internas

```typescript
// ✅ BIEN - Mockear dependencia externa
vi.mock('@maatwork/db', () => ({
  db: {
    insert: vi.fn(),
  },
}));

// ❌ MAL - Mockear código interno del mismo módulo
vi.mock('./utils', () => ({
  helperFunction: vi.fn(),
}));
```

### Fixtures para Datos de Test

```typescript
// tests/fixtures/contacts.ts
export const mockContact = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: '2025-01-01T00:00:00Z',
};

export const mockCreateContactRequest = {
  name: 'John Doe',
  email: 'john@example.com',
};

// En tests
import { mockContact, mockCreateContactRequest } from '@/tests/fixtures/contacts';
```

## Testing de Componentes React

### Testing Library Best Practices

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Queries Preferidas (en orden)
1. `getByRole` - Más accesible
2. `getByLabelText` - Para formularios
3. `getByText` - Para contenido visible
4. `getByTestId` - Último recurso

```typescript
// ✅ BIEN - getByRole
const button = screen.getByRole('button', { name: /submit/i });

// ✅ BIEN - getByLabelText para inputs
const input = screen.getByLabelText(/email/i);

// ⚠️ Evitar - getByTestId (solo si necesario)
const element = screen.getByTestId('custom-element');
```

## Testing de API Endpoints

### Estructura de Test de Endpoint

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('POST /v1/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should return 201 when contact is created', async () => {
    const response = await request(app)
      .post('/v1/contacts')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('John Doe');
  });
  
  it('should return 400 when email is invalid', async () => {
    const response = await request(app)
      .post('/v1/contacts')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'John Doe',
        email: 'invalid-email',
      });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
```

## Testing E2E con Playwright

### Estructura de Test E2E

```typescript
import { test, expect } from '@playwright/test';

test.describe('Contacts Workflow', () => {
  test('should create and list contacts', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to contacts
    await page.click('text=Contacts');
    
    // Create contact
    await page.click('text=New Contact');
    await page.fill('[name="name"]', 'John Doe');
    await page.fill('[name="email"]', 'john@example.com');
    await page.click('button:has-text("Create")');
    
    // Verify contact appears in list
    await expect(page.locator('text=John Doe')).toBeVisible();
  });
});
```

## Patrones Específicos del Proyecto

### Testing de Validaciones Zod

```typescript
describe('Zod validation', () => {
  it('should reject invalid email', () => {
    const schema = z.object({
      email: z.string().email(),
    });
    
    const result = schema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
  });
});
```

### Testing de Transacciones DB

```typescript
describe('Database transactions', () => {
  it('should rollback on error', async () => {
    await expect(
      transactionWithLogging(logger, 'test', async (tx) => {
        await tx.insert(contacts).values({ name: 'Test' });
        throw new Error('Test error');
      })
    ).rejects.toThrow();
    
    // Verify rollback
    const result = await db.select().from(contacts);
    expect(result).toHaveLength(0);
  });
});
```

## Comandos de Testing

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar tests con coverage
pnpm test:coverage

# Ejecutar tests E2E
pnpm test:e2e

# Ejecutar tests en watch mode
pnpm test:watch

# Ejecutar tests de un workspace específico
pnpm -F @maatwork/api test
pnpm -F @maatwork/web test
pnpm -F @maatwork/ui test
```

## Referencias

- Reglas relacionadas:
  - `.cursor/rules/02-testing.mdc` (reglas de testing)
  - `.cursor/rules/domains/api.mdc` (testing de API)
  - `.cursor/rules/domains/ui-package.mdc` (testing de componentes)
- Memorias relacionadas:
  - `.cursor/memories/common-workflows.md` (flujos de trabajo)
- Documentación:
  - `docs/TESTING.md`

## Última Actualización

2025-01-16 - Memoria inicial con preferencias de testing




