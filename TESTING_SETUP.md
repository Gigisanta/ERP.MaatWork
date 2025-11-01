# 🧪 Sistema de Testing - Cactus Dashboard

## 📁 Estructura Creada

```
packages/testing/           # Package centralizado de testing
├── config/
│   └── vitest-shared.ts   # Configuración compartida de Vitest
├── fixtures/              # Datos y mocks para tests
│   ├── auth.ts           # Mocks de autenticación
│   ├── database.ts       # Mocks de base de datos
│   └── setup.ts          # Setup global para tests
├── utils/                # Utilidades de testing
│   ├── helpers.ts        # Helpers genéricos
│   └── mocks.ts          # Mocks comunes (localStorage, fetch, etc)
├── e2e/                  # Tests E2E con Playwright
│   ├── login.spec.ts
│   ├── crm.spec.ts
│   └── kanban.spec.ts
├── playwright.config.ts  # Configuración de Playwright
├── package.json
└── README.md             # Documentación completa

apps/api/tests/           # Tests unitarios de API
├── setup.ts
├── auth.test.ts
└── crm.test.ts

apps/api/vitest.config.ts # Configuración Vitest para API

apps/web/src/tests/       # Ya existían tests de React
└── setup.ts
```

## ✅ Lo que se agregó

### 1. **Package @cactus/testing**
Package centralizado con toda la lógica de testing:
- Configuraciones compartidas
- Fixtures reutilizables (auth, database)
- Mocks comunes
- Tests E2E con Playwright

### 2. **Configuración de API Tests**
- `vitest.config.ts` para tests unitarios
- Tests de ejemplo con supertest
- Scripts `test`, `test:watch`, `test:coverage`

### 3. **Configuración de E2E Tests**
- Playwright configurado
- Tests de ejemplo (login, CRM, Kanban)
- Servidores web automáticos

### 4. **Scripts del Monorepo**
```json
{
  "test": "pnpm --recursive run test",
  "test:web": "pnpm --filter @cactus/web test",
  "test:api": "pnpm --filter @cactus/api test",
  "test:e2e": "pnpm --filter @cactus/testing test:playwright",
  "test:e2e:ui": "pnpm --filter @cactus/testing test:playwright:ui",
  "test:coverage": "pnpm --recursive run test -- --coverage",
  "test:all": "pnpm run test && pnpm run test:e2e"
}
```

## 🚀 Cómo usar

### 1. Instalar dependencias
```bash
pnpm install
```

### 2. Ejecutar tests

**Todos los tests:**
```bash
pnpm run test:all
```

**Solo tests unitarios:**
```bash
pnpm run test          # Todos
pnpm run test:web      # Solo React
pnpm run test:api      # Solo API
```

**Tests E2E:**
```bash
pnpm run test:e2e      # Headless
pnpm run test:e2e:ui   # Con UI interactiva
```

**Con cobertura:**
```bash
pnpm run test:coverage
```

## 📝 Ejemplos de Tests

### Test de Componente React

```typescript
// apps/web/src/components/__tests__/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getAuthHeaders, mockUsers } from '@cactus/testing';
import MyComponent from '../Button';

describe('Button Component', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Test de API

```typescript
// apps/api/tests/contacts.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { getAuthHeaders, mockUsers } from '@cactus/testing';

describe('Contacts API', () => {
  const headers = getAuthHeaders(mockUsers.advisor);
  
  it('should get contacts', async () => {
    const response = await request(app)
      .get('/api/crm/contacts')
      .set(headers);
    
    expect(response.status).toBe(200);
  });
});
```

### Test E2E

```typescript
// packages/testing/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';
import { mockUsers } from '@cactus/testing';

test('user can access dashboard', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', mockUsers.advisor.email);
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/dashboard/);
});
```

## 🎯 Próximos Pasos

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Ejecutar tests para verificar:**
   ```bash
   pnpm run test:api
   ```

3. **Agregar más tests según necesidad:**
   - Componentes específicos en `apps/web/src/components/__tests__/`
   - Endpoints API en `apps/api/tests/`
   - Flujos E2E en `packages/testing/e2e/`

## 📚 Documentación

Ver `packages/testing/README.md` para documentación completa del sistema de testing.

