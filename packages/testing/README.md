# @cactus/testing

Package centralizado para todas las utilidades y configuraciones de testing del proyecto Cactus Dashboard.

## 📦 Estructura

```
packages/testing/
├── config/          # Configuraciones compartidas
├── fixtures/         # Mocks y datos de prueba
├── utils/           # Utilidades y helpers
├── e2e/            # Tests E2E con Playwright
└── index.ts       # Exportaciones principales
```

## 🧪 Tipos de Testing

### 1. Unit Tests (Vitest)

Para testing de componentes y funciones individuales.

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### 2. API Tests (Supertest + Vitest)

Para testing de endpoints de la API.

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { getAuthHeaders } from '@cactus/testing';

describe('API Endpoints', () => {
  it('should return contacts', async () => {
    const response = await request(app)
      .get('/api/crm/contacts')
      .set(getAuthHeaders());
    
    expect(response.status).toBe(200);
  });
});
```

### 3. E2E Tests (Playwright)

Para testing de flujos completos de usuario.

```typescript
import { test, expect } from '@playwright/test';
import { mockUsers } from '@cactus/testing';

test('user can login', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', mockUsers.advisor.email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/dashboard/);
});
```

## 🔧 Utilidades Disponibles

### Fixtures

#### Auth Fixtures

```typescript
import { mockUsers, getAuthHeaders, generateMockToken } from '@cactus/testing';

// Usuarios predefinidos
mockUsers.admin
mockUsers.manager
mockUsers.advisor

// Headers de autenticación para API tests
const headers = getAuthHeaders(mockUsers.advisor);

// Token JWT mock
const token = generateMockToken(mockUsers.admin);
```

#### Database Fixtures

```typescript
import { mockContacts, mockDeals, createMockDatabase } from '@cactus/testing';

// Datos mock
const contacts = mockContacts;
const deals = mockDeals;

// Base de datos mock
const db = createMockDatabase();
```

### Helpers

```typescript
import { waitFor, generateTestEmail, generateTestPhone } from '@cactus/testing';

// Esperar condición
await waitFor(() => condition === true);

// Generar datos de prueba
const email = generateTestEmail('user');
const phone = generateTestPhone();
```

### Mocks

```typescript
import { mockLocalStorage, createMockFetch, createMockSupabaseClient } from '@cactus/testing';

// Mock localStorage
const storage = mockLocalStorage();

// Mock fetch
const mockFetch = createMockFetch({ data: 'test' }, 200);

// Mock Supabase
const supabase = createMockSupabaseClient();
```

## 🚀 Comandos

### Desde el root del monorepo

```bash
# Ejecutar todos los tests
pnpm run test

# Tests unitarios de la web
pnpm run test:web

# Tests unitarios de la API
pnpm run test:api

# Tests E2E
pnpm run test:e2e

# Tests E2E con UI
pnpm run test:e2e:ui

# Con cobertura
pnpm run test:coverage
```

### Desde cada app

```bash
# Web - Tests unitarios
cd apps/web
pnpm run test
pnpm run test:watch

# API - Tests unitarios
cd apps/api
pnpm run test
pnpm run test:watch
pnpm run test:coverage
```

### Testing package

```bash
# E2E tests
cd packages/testing
pnpm run test:playwright
pnpm run test:playwright:ui
pnpm run test:playwright:debug
```

## 📝 Ejemplos de Tests

### Test de Componente React

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockSupabaseClient } from '@cactus/testing';

import ContactsManager from './ContactsManager';

describe('ContactsManager', () => {
  it('debería mostrar la lista de contactos', () => {
    render(<ContactsManager />);
    expect(screen.getByText('Contactos')).toBeInTheDocument();
  });

  it('debería permitir crear un nuevo contacto', async () => {
    const user = userEvent.setup();
    render(<ContactsManager />);
    
    await user.click(screen.getByText('Nuevo Contacto'));
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByText('Guardar'));
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
```

### Test de Endpoint API

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { getAuthHeaders, mockUsers } from '@cactus/testing';

describe('POST /api/crm/contacts', () => {
  const headers = getAuthHeaders(mockUsers.advisor);

  it('debería crear un contacto válido', async () => {
    const contact = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
    };

    const response = await request(app)
      .post('/api/crm/contacts')
      .set(headers)
      .send(contact);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(contact);
  });

  it('debería rechazar datos inválidos', async () => {
    const response = await request(app)
      .post('/api/crm/contacts')
      .set(headers)
      .send({ name: 'Incomplete' });

    expect(response.status).toBe(400);
  });
});
```

### Test E2E Completo

```typescript
import { test, expect } from '@playwright/test';
import { mockUsers } from '@cactus/testing';

test.describe('Flujo CRM Completo', () => {
  test('usuario puede crear y gestionar contactos', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', mockUsers.advisor.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navegar a CRM
    await page.click('a:has-text("CRM")');
    await expect(page).toHaveURL(/crm/);
    
    // Crear contacto
    await page.click('button:has-text("Nuevo")');
    await page.fill('input[name="name"]', 'Test Contact');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button:has-text("Guardar")');
    
    // Verificar contacto creado
    await expect(page.locator('text=Test Contact')).toBeVisible();
  });
});
```

## 🎯 Mejores Prácticas

1. **Tests Unitarios**: Comprueban lógica aislada
2. **Tests de Integración**: Prueban interacciones entre módulos
3. **Tests E2E**: Verifican flujos completos de usuario
4. **Usa fixtures compartidos**: Reutiliza mocks y datos de prueba
5. **Mantén tests rápidos**: E2E tests solo para flujos críticos
6. **Usa nombres descriptivos**: `should redirect to login when unauthenticated`

## 📊 Cobertura

Para ver la cobertura de tests:

```bash
pnpm run test:coverage
```

Los reportes se generan en `coverage/` de cada app.

## 🔗 Referencias

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

