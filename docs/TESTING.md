# Testing Guide

Esta guía explica cómo escribir y ejecutar tests en el proyecto CACTUS CRM.

## Tipos de Tests

### Unit Tests
Tests rápidos que prueban funciones y componentes de forma aislada usando mocks.

**Ubicación:**
- API: `apps/api/src/**/*.test.ts` (mismo directorio que el archivo)
- Web: `apps/web/**/*.test.tsx` (mismo directorio que el archivo)
- UI: `packages/ui/src/**/*.test.tsx` (mismo directorio que el componente)

**Ejecutar:**
```bash
pnpm test                    # Todos los unit tests
pnpm test:watch             # Modo watch
pnpm test:coverage          # Con coverage
pnpm test:api               # Solo API
pnpm test:web               # Solo Web
```

### Integration Tests
Tests que usan una base de datos real para probar flujos completos.

**Ubicación:**
- `apps/api/src/__tests__/integration/**/*.test.ts`
- `apps/api/src/**/*.integration.test.ts`

**Ejecutar:**
```bash
pnpm test:integration
```

**Requisitos:**
- `TEST_DATABASE_URL` o `DATABASE_URL` debe estar configurado
- Base de datos debe tener migraciones aplicadas

### E2E Tests
Tests end-to-end que prueban la aplicación completa desde el navegador.

**Ubicación:**
- `tests/e2e/**/*.spec.ts`

**Ejecutar:**
```bash
pnpm e2e                    # Ejecutar todos los E2E tests
pnpm e2e:ui                # Modo UI interactivo
pnpm e2e:headed            # Con navegador visible
pnpm e2e:report            # Ver reporte HTML
```

### Visual Regression Tests
Tests que comparan screenshots para detectar cambios visuales.

**Ubicación:**
- `tests/visual/**/*.spec.ts`

**Ejecutar:**
```bash
pnpm test:visual
```

### Performance Tests
Tests de carga y rendimiento usando k6.

**Ubicación:**
- `apps/api/src/__tests__/performance/load/*.js`

**Ejecutar:**
```bash
k6 run apps/api/src/__tests__/performance/load/auth-load-test.js
```

## Escribir Unit Tests

### API Unit Test Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myFunction } from './my-module';

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Web Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Usando Test Helpers

#### API Helpers

```typescript
import { createTestUser, createTestToken } from '@/__tests__/helpers/test-auth';
import { createTestContact } from '@/__tests__/helpers/test-fixtures';
import { createMockRequest, createMockResponse } from '@/__tests__/helpers/test-server';

// Crear usuario de prueba
const user = await createTestUser({ role: 'admin' });

// Crear token
const token = await createTestToken(user);

// Crear contacto de prueba
const contact = await createTestContact({ firstName: 'Test' });

// Mock request/response
const req = createMockRequest({ user });
const res = createMockResponse();
```

#### Web Helpers

```typescript
import { renderWithProviders } from '@/src/__tests__/helpers/test-utils';
import { mockUseRouter } from '@/src/__tests__/helpers/test-router';
import { mockUseAuth } from '@/src/__tests__/helpers/test-auth';

// Mock router
mockUseRouter({ pathname: '/contacts' });

// Mock auth
mockUseAuth({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

// Render con providers
renderWithProviders(<MyComponent />);
```

## Escribir Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@cactus/db';
import { createTestUser, deleteTestUser } from '@/__tests__/helpers/test-auth';

describe('Auth Integration', () => {
  let testUserId: string | null = null;

  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  it('should create and verify user', async () => {
    const user = await createTestUser();
    testUserId = user.id;
    
    // Test with real DB
    const [dbUser] = await db()
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    
    expect(dbUser).toBeDefined();
  });
});
```

## Escribir E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Contacts', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
  });

  test('should create contact', async ({ page }) => {
    await page.goto('/contacts');
    await page.click('text=New Contact');
    await page.fill('[name="firstName"]', 'Test');
    await page.click('text=Save');
    
    await expect(page.getByText('Test')).toBeVisible();
  });
});
```

## Coverage Goals

- **Código Crítico (auth, data handling, payments):** 100%
- **API General:** 80%+
- **Web:** 80%+
- **UI Package:** 80%+

## Best Practices

1. **Nombres descriptivos:** Usa nombres que expliquen qué se está probando
2. **Arrange-Act-Assert:** Organiza tests en estas tres secciones
3. **Un test, una cosa:** Cada test debe verificar una sola funcionalidad
4. **Tests independientes:** Los tests no deben depender unos de otros
5. **Mock externos:** Mockea dependencias externas (DB, APIs, etc.)
6. **Cleanup:** Limpia datos de prueba después de cada test
7. **Edge cases:** Prueba casos límite y errores

## Debugging Tests

### Ver output detallado
```bash
pnpm test -- --reporter=verbose
```

### Ejecutar un test específico
```bash
pnpm test -- my-test-file.test.ts
```

### Modo watch para desarrollo
```bash
pnpm test:watch
```

### Ver coverage HTML
```bash
pnpm test:coverage
# Abre coverage/index.html en el navegador
```

## CI/CD

Los tests se ejecutan automáticamente en CI:
- Unit tests en cada PR
- Integration tests (opcional, puede fallar)
- E2E tests en PRs
- Visual regression tests (opcional)

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [k6 Documentation](https://k6.io/docs/)

