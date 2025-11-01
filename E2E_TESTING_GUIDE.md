# 🎯 Guía de E2E Testing Escalable con Playwright

## 📋 Índice
1. [Principios Fundamentales](#principios-fundamentales)
2. [Arquitectura de Carpetas](#arquitectura-de-carpetas)
3. [Configuración Base](#configuración-base)
4. [Patterns de Testing](#patterns-de-testing)
5. [Page Object Model (POM)](#page-object-model-pom)
6. [Fixtures y Helpers](#fixtures-y-helpers)
7. [Data Management](#data-management)
8. [Parallel Testing](#parallel-testing)
9. [CI/CD Integration](#cicd-integration)
10. [Best Practices](#best-practices)

---

## 🎓 Principios Fundamentales

### **¿Qué testear con E2E?**

✅ **SÍ testear:**
- Flujos críticos de usuario (login, checkout, onboarding)
- Integraciones entre módulos
- Funcionalidad que genera revenue
- Features críticas para el negocio
- Escenarios happy path principales

❌ **NO testear:**
- Validaciones de formularios simples (unit test)
- Estilos y layout (visual regression test)
- Lógica de negocio (unit test)
- Edge cases complejos (integration test)

### **Pirámide de Testing**

```
        ╱╲
       ╱E2E╲          ← 10-20% (Playwright)
      ╱────╲
     ╱ Integ╲         ← 20-30% (Supertest + DB)
    ╱────────╲
   ╱  Unit    ╲       ← 50-70% (Vitest)
  ╱────────────╲
```

**Para CACTUS CRM:**
- **Unit (Vitest):** 70% - Lógica de negocio, utils, cálculos
- **Integration:** 20% - API endpoints, DB queries
- **E2E (Playwright):** 10% - Flujos críticos de usuario

---

## 📁 Arquitectura de Carpetas

### **Estructura Recomendada:**

```
tests/
├── e2e/
│   ├── specs/                    # Tests organizados por feature
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── signup.spec.ts
│   │   │   └── password-reset.spec.ts
│   │   ├── portfolios/
│   │   │   ├── create.spec.ts
│   │   │   ├── edit.spec.ts
│   │   │   └── compare.spec.ts
│   │   ├── contacts/
│   │   │   ├── crud.spec.ts
│   │   │   └── tags.spec.ts
│   │   └── analytics/
│   │       ├── performance.spec.ts
│   │       └── benchmarks.spec.ts
│   │
│   ├── pages/                    # Page Object Model
│   │   ├── auth/
│   │   │   ├── LoginPage.ts
│   │   │   └── SignupPage.ts
│   │   ├── portfolios/
│   │   │   ├── PortfolioListPage.ts
│   │   │   ├── PortfolioDetailPage.ts
│   │   │   └── PortfolioComparatorPage.ts
│   │   └── BasePage.ts           # Funcionalidad compartida
│   │
│   ├── fixtures/                 # Test data y setup
│   │   ├── auth.fixture.ts       # Setup de usuarios
│   │   ├── portfolio.fixture.ts  # Setup de portfolios
│   │   ├── database.fixture.ts   # Reset y seed DB
│   │   └── api.fixture.ts        # API mocks/stubs
│   │
│   ├── helpers/                  # Utilidades
│   │   ├── assertions.ts         # Custom assertions
│   │   ├── wait-for.ts           # Wait utilities
│   │   └── data-generators.ts    # Generadores de data
│   │
│   └── config/                   # Configs específicas
│       ├── test-data.ts          # Data constantes
│       └── users.ts              # Test users
│
├── playwright.config.ts          # Config principal
└── global-setup.ts               # Setup global (DB, seed, etc)
```

---

## ⚙️ Configuración Base

### **`playwright.config.ts` Profesional:**

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: '.env.test' });

export default defineConfig({
  // Test directory
  testDir: './tests/e2e/specs',
  
  // Output
  outputDir: './tests/e2e/results',
  
  // Parallel execution
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined, // 2 workers en CI, auto en local
  
  // Retries
  retries: process.env.CI ? 2 : 0, // Retry en CI por flakiness
  
  // Timeout
  timeout: 30_000, // 30s por test
  expect: {
    timeout: 5_000, // 5s por assertion
  },
  
  // Reporter
  reporter: [
    ['html', { outputFolder: './tests/e2e/report' }],
    ['json', { outputFile: './tests/e2e/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  // Global setup/teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  
  // Shared settings
  use: {
    // Base URL
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Trace on failure
    trace: 'on-first-retry',
    
    // Screenshots
    screenshot: 'only-on-failure',
    
    // Video
    video: 'retain-on-failure',
    
    // Navigation timeout
    navigationTimeout: 10_000,
    
    // Action timeout
    actionTimeout: 5_000,
  },
  
  // Projects (browsers)
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile (opcional, solo para responsive crítico)
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],
  
  // Web server (auto-start)
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
```

### **`.env.test` (Variables de Test):**

```bash
# Base URLs
E2E_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://cactus_test:password@localhost:5433/cactus_test

# Test user credentials
TEST_USER_EMAIL=test@cactus.com
TEST_USER_PASSWORD=Test123!
TEST_ADMIN_EMAIL=admin@cactus.com
TEST_ADMIN_PASSWORD=Admin123!

# Feature flags (si usas)
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=false
```

---

## 🧩 Page Object Model (POM)

### **¿Por qué POM?**

✅ **Beneficios:**
- DRY: No repetir selectores
- Mantenibilidad: Cambios de UI en un solo lugar
- Legibilidad: Tests más declarativos
- Reusabilidad: Compartir acciones entre tests

### **Ejemplo: BasePage.ts**

```typescript
// tests/e2e/pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  // Navigation
  async goto(path: string) {
    await this.page.goto(path);
  }
  
  // Wait helpers
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
  
  async waitForElement(selector: string) {
    await this.page.waitForSelector(selector, { state: 'visible' });
  }
  
  // Common actions
  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }
  
  async fillInput(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }
  
  // Toast notifications
  async expectToast(message: string) {
    const toast = this.page.locator('[role="status"]', { hasText: message });
    await toast.waitFor({ state: 'visible' });
  }
  
  // Modal helpers
  async expectModalOpen(title: string) {
    const modal = this.page.getByRole('dialog', { name: title });
    await modal.waitFor({ state: 'visible' });
  }
  
  async closeModal() {
    await this.page.getByRole('button', { name: /close|cerrar/i }).click();
  }
}
```

### **Ejemplo: LoginPage.ts**

```typescript
// tests/e2e/pages/auth/LoginPage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class LoginPage extends BasePage {
  // Locators (declarativos)
  readonly emailInput = () => this.page.getByLabel(/email|correo/i);
  readonly passwordInput = () => this.page.getByLabel(/password|contraseña/i);
  readonly loginButton = () => this.page.getByRole('button', { name: /login|iniciar/i });
  readonly errorMessage = () => this.page.locator('[role="alert"]');
  
  constructor(page: Page) {
    super(page);
  }
  
  // Actions
  async navigate() {
    await this.goto('/login');
  }
  
  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
  }
  
  async expectLoginSuccess() {
    await this.page.waitForURL('/dashboard');
    await expect(this.page).toHaveTitle(/dashboard|inicio/i);
  }
  
  async expectLoginError(message: string) {
    await expect(this.errorMessage()).toContainText(message);
  }
}
```

### **Ejemplo: PortfolioListPage.ts**

```typescript
// tests/e2e/pages/portfolios/PortfolioListPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class PortfolioListPage extends BasePage {
  // Locators
  readonly createButton = () => this.page.getByRole('button', { name: /create|crear/i });
  readonly searchInput = () => this.page.getByPlaceholder(/search|buscar/i);
  readonly portfolioCard = (name: string) => 
    this.page.locator(`[data-testid="portfolio-card"]`, { hasText: name });
  
  constructor(page: Page) {
    super(page);
  }
  
  async navigate() {
    await this.goto('/portfolios');
    await this.waitForNetworkIdle();
  }
  
  async createPortfolio(data: { name: string; description: string; riskLevel: string }) {
    await this.createButton().click();
    await this.expectModalOpen('Nuevo Portfolio');
    
    await this.fillInput('Nombre', data.name);
    await this.fillInput('Descripción', data.description);
    await this.page.getByLabel('Nivel de Riesgo').selectOption(data.riskLevel);
    
    await this.clickButton('Crear');
    await this.expectToast('Portfolio creado');
  }
  
  async searchPortfolio(name: string) {
    await this.searchInput().fill(name);
    await this.waitForNetworkIdle();
  }
  
  async deletePortfolio(name: string) {
    const card = this.portfolioCard(name);
    await card.getByRole('button', { name: /delete|eliminar/i }).click();
    
    await this.expectModalOpen('Confirmar');
    await this.clickButton('Eliminar');
    await this.expectToast('Portfolio eliminado');
  }
  
  async expectPortfolioExists(name: string) {
    await expect(this.portfolioCard(name)).toBeVisible();
  }
  
  async expectPortfolioCount(count: number) {
    const cards = this.page.locator('[data-testid="portfolio-card"]');
    await expect(cards).toHaveCount(count);
  }
}
```

---

## 🎨 Patterns de Testing

### **Pattern 1: Arrange-Act-Assert (AAA)**

```typescript
// tests/e2e/specs/portfolios/create.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { PortfolioListPage } from '../../pages/portfolios/PortfolioListPage';
import { TEST_USER } from '../../config/users';

test.describe('Portfolio Creation', () => {
  test('should create portfolio successfully', async ({ page }) => {
    // ARRANGE - Setup
    const loginPage = new LoginPage(page);
    const portfolioPage = new PortfolioListPage(page);
    
    await loginPage.navigate();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await portfolioPage.navigate();
    
    // ACT - Acción
    await portfolioPage.createPortfolio({
      name: 'Tech Growth Portfolio',
      description: 'High growth tech stocks',
      riskLevel: 'aggressive',
    });
    
    // ASSERT - Verificación
    await portfolioPage.expectPortfolioExists('Tech Growth Portfolio');
  });
});
```

### **Pattern 2: Test Fixtures (Setup Automático)**

```typescript
// tests/e2e/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import { TEST_USER } from '../config/users';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login automático
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await loginPage.expectLoginSuccess();
    
    // Use page con sesión activa
    await use(page);
    
    // Teardown (opcional)
    // await page.close();
  },
});

export { expect } from '@playwright/test';
```

**Uso:**

```typescript
// tests/e2e/specs/portfolios/edit.spec.ts
import { test, expect } from '../../fixtures/auth.fixture';
import { PortfolioListPage } from '../../pages/portfolios/PortfolioListPage';

test('should edit portfolio', async ({ authenticatedPage }) => {
  // Ya estás logueado! 🎉
  const portfolioPage = new PortfolioListPage(authenticatedPage);
  await portfolioPage.navigate();
  
  // ... resto del test
});
```

### **Pattern 3: API-First Setup (Rápido)**

```typescript
// tests/e2e/helpers/api-setup.ts
import { request } from '@playwright/test';

export async function createPortfolioViaAPI(data: {
  name: string;
  description: string;
  userId: string;
}) {
  const context = await request.newContext({
    baseURL: process.env.API_BASE_URL,
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.TEST_TOKEN}`,
    },
  });
  
  const response = await context.post('/v1/portfolios', {
    data,
  });
  
  return response.json();
}

export async function cleanupPortfolios(userId: string) {
  const context = await request.newContext({
    baseURL: process.env.API_BASE_URL,
  });
  
  await context.delete(`/v1/users/${userId}/portfolios`);
}
```

**Uso:**

```typescript
test('should compare multiple portfolios', async ({ page }) => {
  // Setup rápido con API (sin UI)
  const portfolio1 = await createPortfolioViaAPI({
    name: 'Portfolio A',
    description: 'Test',
    userId: TEST_USER.id,
  });
  
  const portfolio2 = await createPortfolioViaAPI({
    name: 'Portfolio B',
    description: 'Test',
    userId: TEST_USER.id,
  });
  
  // Test solo la UI de comparación
  const comparatorPage = new PortfolioComparatorPage(page);
  await comparatorPage.navigate();
  await comparatorPage.comparePortfolios([portfolio1.id, portfolio2.id]);
  
  // ... assertions
});
```

---

## 🔧 Fixtures y Helpers

### **Database Fixture (Reset DB entre tests)**

```typescript
// tests/e2e/fixtures/database.fixture.ts
import { test as base } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const test = base.extend({
  cleanDatabase: async ({}, use) => {
    // Setup: Reset DB antes del test
    await execAsync('pnpm -F @cactus/db db:reset:test');
    await execAsync('pnpm -F @cactus/db seed:test');
    
    await use(undefined);
    
    // Teardown (opcional)
    // await execAsync('pnpm -F @cactus/db db:reset:test');
  },
});
```

### **Custom Assertions**

```typescript
// tests/e2e/helpers/assertions.ts
import { expect as baseExpect } from '@playwright/test';

export const expect = baseExpect.extend({
  async toHaveToast(page, expectedMessage: string) {
    const toast = page.locator('[role="status"]', { hasText: expectedMessage });
    const isVisible = await toast.isVisible();
    
    return {
      pass: isVisible,
      message: () => `Expected toast with message "${expectedMessage}" to be visible`,
    };
  },
  
  async toBeLoading(locator) {
    const hasLoadingState = await locator.getAttribute('data-loading') === 'true';
    
    return {
      pass: hasLoadingState,
      message: () => 'Expected element to be in loading state',
    };
  },
});
```

---

## 📊 Data Management

### **Test Data Strategy**

```typescript
// tests/e2e/config/test-data.ts

export const TEST_USERS = {
  admin: {
    email: 'admin@cactus.com',
    password: 'Admin123!',
    role: 'admin',
  },
  regular: {
    email: 'user@cactus.com',
    password: 'User123!',
    role: 'user',
  },
  viewer: {
    email: 'viewer@cactus.com',
    password: 'Viewer123!',
    role: 'viewer',
  },
};

export const TEST_PORTFOLIOS = {
  conservative: {
    name: 'Conservative Portfolio',
    description: 'Low risk, stable returns',
    riskLevel: 'conservative',
    assets: [
      { symbol: 'BND', weight: 60 },
      { symbol: 'VTI', weight: 40 },
    ],
  },
  aggressive: {
    name: 'Aggressive Portfolio',
    description: 'High risk, high returns',
    riskLevel: 'aggressive',
    assets: [
      { symbol: 'QQQ', weight: 70 },
      { symbol: 'ARKK', weight: 30 },
    ],
  },
};

export const TEST_INSTRUMENTS = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf' },
];
```

### **Data Generators (Faker.js)**

```typescript
// tests/e2e/helpers/data-generators.ts
import { faker } from '@faker-js/faker';

export function generatePortfolio() {
  return {
    name: faker.finance.accountName(),
    description: faker.lorem.sentence(),
    riskLevel: faker.helpers.arrayElement(['conservative', 'moderate', 'aggressive']),
  };
}

export function generateUser() {
  return {
    email: faker.internet.email(),
    password: 'Test123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };
}
```

---

## ⚡ Parallel Testing

### **Configuración para Tests Independientes**

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true, // Ejecutar todos los tests en paralelo
  workers: process.env.CI ? 2 : 4, // Limitar workers en CI
});
```

### **Isolation entre Tests**

```typescript
// Cada test debe ser independiente
test.beforeEach(async ({ page }) => {
  // Reset estado
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => sessionStorage.clear());
});

test.afterEach(async ({ page }) => {
  // Cleanup
  await page.close();
});
```

### **Compartir Estado (cuando sea necesario)**

```typescript
// tests/e2e/specs/portfolios/workflow.spec.ts

// Serial: ejecutar tests en orden
test.describe.serial('Portfolio workflow', () => {
  let portfolioId: string;
  
  test('1. Create portfolio', async ({ page }) => {
    // ...
    portfolioId = await getCreatedPortfolioId(page);
  });
  
  test('2. Edit portfolio', async ({ page }) => {
    // Usa portfolioId del test anterior
    await page.goto(`/portfolios/${portfolioId}/edit`);
    // ...
  });
  
  test('3. Delete portfolio', async ({ page }) => {
    await page.goto(`/portfolios/${portfolioId}`);
    // ...
  });
});
```

---

## 🚀 CI/CD Integration

### **GitHub Actions Workflow**

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: cactus_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: cactus_test
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Setup database
        run: |
          pnpm -F @cactus/db db:push
          pnpm -F @cactus/db seed:test
        env:
          DATABASE_URL: postgresql://cactus_test:test_password@localhost:5433/cactus_test
      
      - name: Build apps
        run: pnpm build
      
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium
      
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://cactus_test:test_password@localhost:5433/cactus_test
          E2E_BASE_URL: http://localhost:3000
          API_BASE_URL: http://localhost:3001
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: tests/e2e/report/
          retention-days: 7
      
      - name: Upload videos
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-videos
          path: tests/e2e/results/**/*.webm
          retention-days: 3
```

---

## ✅ Best Practices

### **1. Selectores Estables**

```typescript
// ❌ MAL - Frágil, cambia con estilos
await page.locator('.btn-primary').click();
await page.locator('div:nth-child(3) > button').click();

// ✅ BIEN - Semántico, accesible
await page.getByRole('button', { name: 'Login' }).click();
await page.getByLabel('Email').fill('test@example.com');
await page.getByTestId('submit-button').click(); // Si es necesario
```

**Jerarquía de Selectores:**
1. `getByRole()` - Mejor para accesibilidad
2. `getByLabel()` - Formularios
3. `getByText()` - Contenido visible
4. `getByTestId()` - Como último recurso
5. `locator()` con CSS - Evitar

### **2. Esperas Inteligentes**

```typescript
// ❌ MAL - Hardcoded delays
await page.waitForTimeout(5000);

// ✅ BIEN - Esperar condiciones específicas
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-loaded="true"]');
await expect(page.getByText('Loaded')).toBeVisible();
```

### **3. Manejo de Errores**

```typescript
test('should handle API errors gracefully', async ({ page }) => {
  // Simular error de API
  await page.route('**/api/portfolios', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });
  
  await page.goto('/portfolios');
  
  // Verificar error handling
  await expect(page.getByText(/error|algo salió mal/i)).toBeVisible();
});
```

### **4. Test Isolation**

```typescript
// ❌ MAL - Tests acoplados
let sharedPortfolioId: string;

test('create portfolio', async () => {
  sharedPortfolioId = await createPortfolio();
});

test('edit portfolio', async () => {
  await editPortfolio(sharedPortfolioId); // Falla si el anterior falla
});

// ✅ BIEN - Tests independientes
test('edit portfolio', async () => {
  // Setup propio
  const portfolioId = await createPortfolioViaAPI();
  
  // Test
  await editPortfolio(portfolioId);
  
  // Cleanup
  await deletePortfolioViaAPI(portfolioId);
});
```

### **5. Debugging Tips**

```typescript
// 1. Pausar ejecución
await page.pause();

// 2. Screenshots manuales
await page.screenshot({ path: 'debug.png', fullPage: true });

// 3. Console logs
page.on('console', msg => console.log('Browser:', msg.text()));

// 4. Network logs
page.on('response', response => {
  if (response.status() >= 400) {
    console.log('Failed request:', response.url(), response.status());
  }
});

// 5. Trace viewer (mejor opción)
// npx playwright show-trace trace.zip
```

### **6. Performance Testing**

```typescript
test('portfolio page should load fast', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/portfolios');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000); // Menos de 3s
});
```

---

## 📊 Checklist de Test Coverage

### **Para CACTUS CRM - Features Críticas:**

#### **Auth (Alta prioridad)** ✅
- [ ] Login exitoso
- [ ] Login fallido (credenciales incorrectas)
- [ ] Logout
- [ ] Session persistence (refresh page)
- [ ] Token expiration handling

#### **Portfolios (Alta prioridad)** ✅
- [ ] Crear portfolio
- [ ] Editar portfolio
- [ ] Eliminar portfolio
- [ ] Buscar portfolio
- [ ] Ver detalle de portfolio
- [ ] Comparar múltiples portfolios

#### **Analytics (Media prioridad)**
- [ ] Ver performance de portfolio
- [ ] Comparar con benchmark
- [ ] Cambiar período de tiempo
- [ ] Exportar datos

#### **Benchmarks (Media prioridad)**
- [ ] Crear benchmark custom
- [ ] Editar benchmark
- [ ] Eliminar benchmark
- [ ] Usar benchmark predefinido

#### **Instruments (Baja prioridad)**
- [ ] Buscar instrumento
- [ ] Ver detalle de instrumento
- [ ] Agregar instrumento a portfolio

---

## 🎯 Roadmap de Implementación

### **Fase 1: Foundation (1-2 semanas)**
1. ✅ Configurar Playwright
2. ✅ Crear estructura de carpetas
3. ✅ Implementar BasePage
4. ✅ Setup CI/CD básico
5. ✅ 3-5 tests críticos (login, create portfolio)

### **Fase 2: Coverage (2-3 semanas)**
1. Implementar todos los Page Objects
2. Tests para flujos críticos (15-20 tests)
3. Fixtures avanzados (auth, DB)
4. API setup helpers

### **Fase 3: Advanced (1-2 semanas)**
1. Visual regression testing (Playwright screenshots)
2. Performance testing
3. API mocking avanzado
4. Parallel execution optimization

### **Fase 4: Maintenance (Continuo)**
1. Actualizar tests con nuevas features
2. Refactorizar tests flakey
3. Mejorar performance de test suite
4. Documentar patterns nuevos

---

## 📚 Recursos Adicionales

### **Documentación Oficial:**
- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)

### **Tools Útiles:**
- **Playwright Codegen**: `npx playwright codegen http://localhost:3000`
- **Playwright Inspector**: `npx playwright test --debug`
- **Trace Viewer**: `npx playwright show-trace trace.zip`
- **VS Code Extension**: Playwright Test for VSCode

---

## 🎓 Conclusión

### **Puntos Clave:**

1. ✅ **POM siempre** - Mantén tests legibles y mantenibles
2. ✅ **API-first setup** - Usa API para setup rápido, UI para lo que importa
3. ✅ **Test isolation** - Cada test debe correr independiente
4. ✅ **Selectores semánticos** - `getByRole`, `getByLabel`
5. ✅ **Fixtures** - Reutiliza setup común
6. ✅ **Parallel** - Ejecuta tests en paralelo
7. ✅ **CI/CD** - Automatiza todo
8. ✅ **10-20% coverage** - No sobre-testear con E2E

### **Anti-Patterns a Evitar:**

❌ Tests con hardcoded delays (`waitForTimeout`)  
❌ Selectores CSS frágiles  
❌ Tests acoplados (dependen unos de otros)  
❌ Setup manual repetitivo (usa fixtures)  
❌ Testear validaciones simples (usa unit tests)  
❌ Sobre-testing (100% E2E es caro y lento)

---

**¿Listo para escribir tests E2E escalables?** 🚀

