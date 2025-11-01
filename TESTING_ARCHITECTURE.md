# 🧪 Arquitectura de Testing - CACTUS CRM

## 📚 Tabla de Contenidos

- [Principios Generales](#principios-generales)
- [Pirámide de Testing](#pirámide-de-testing)
- [Unit Tests (Vitest)](#unit-tests-vitest)
- [E2E Tests (Playwright)](#e2e-tests-playwright)
- [Comandos](#comandos)
- [Coverage Targets](#coverage-targets)
- [Estructura de Archivos](#estructura-de-archivos)

---

## 🎯 Principios Generales

### Testing Stack

- **Unit Tests:** Vitest (NO Jest)
- **E2E Tests:** Playwright (NO Supertest para E2E)
- **Component Tests:** Testing Library + Vitest

### ¿Por qué esta stack?

| Framework | Razón |
|-----------|-------|
| **Vitest** | Más rápido que Jest, mejor integración con ESM, sintaxis compatible |
| **Playwright** | E2E real con browser, mejor DX que Cypress, cross-browser |
| **Testing Library** | Mejores prácticas para testing de componentes React |

---

## 📊 Pirámide de Testing

```
        ╱╲
       ╱E2E╲         ← 10-20% (Playwright)
      ╱────╲         tests/e2e/
     ╱      ╲
    ╱  Unit  ╲       ← 80-90% (Vitest)
   ╱──────────╲      src/**/*.test.ts
  ╱────────────╲
```

**Distribución:**
- **80-90% Unit Tests:** Funciones puras, utilidades, validaciones
- **10-20% E2E Tests:** Flujos críticos de usuario

**❌ NO tenemos Integration Tests (Supertest)** porque:
1. Los E2E de Playwright ya cubren integración completa
2. Simplifica la arquitectura (2 capas en lugar de 3)
3. Menos mantenimiento

---

## ✅ Unit Tests (Vitest)

### Ubicación

**SIEMPRE al lado del archivo original:**

```
src/
├── config/
│   ├── aum-limits.ts
│   └── aum-limits.test.ts      ✅ Correcto
├── utils/
│   ├── batch-validation.ts
│   └── batch-validation.test.ts ✅ Correcto
└── routes/
    └── aum.ts                   (lógica compleja debe extraerse a utils)
```

**❌ NO hacer:**
```
src/
├── __tests__/                   ❌ Carpeta separada
│   └── aum.test.ts
└── tests/                       ❌ Carpeta de unit tests
    └── unit/
```

### Qué testear

✅ **SÍ testear:**
- Funciones de validación (Zod schemas, utils)
- Cálculos de negocio (timeouts dinámicos, scores)
- Transformaciones de datos
- Error handling helpers
- Constantes y configuraciones

❌ **NO testear:**
- Routes completas (usar E2E)
- Componentes de UI (usar E2E para flujos críticos)
- Database queries directas

### Ejemplo

```typescript
// batch-validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateBatchIds } from './batch-validation';

describe('validateBatchIds', () => {
  it('debería rechazar IDs sobre el límite', () => {
    const ids = Array(101).fill('uuid').join(',');
    const result = validateBatchIds(ids, { maxCount: 100 });
    
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toContain('Too many IDs');
  });
});
```

### Comandos

```bash
# Backend
cd apps/api
pnpm test              # Run unit tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Con coverage report

# Frontend
cd apps/web
pnpm test              # Run unit tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Con coverage report
```

---

## 🌐 E2E Tests (Playwright)

### Ubicación

**SIEMPRE en `tests/e2e/`:**

```
tests/
└── e2e/
    ├── auth.spec.ts          ✅ Playwright E2E
    ├── contacts.spec.ts      ✅ Playwright E2E
    └── aum.spec.ts           ✅ Playwright E2E (futuro)
```

**❌ NO hacer:**
```
apps/api/src/__tests__/        ❌ Integration tests con Supertest
tests/integration/             ❌ Capa innecesaria
```

### Qué testear

✅ **SÍ testear:**
- Flujos críticos de usuario (login, registro, CRUD)
- Navegación entre páginas
- Formularios y validaciones visuales
- Estados de error visibles
- Happy paths + edge cases críticos

❌ **NO testear:**
- Validaciones que ya están en unit tests
- Cada endpoint de API (usar unit tests)
- UI/UX detallado (muy frágil)

### Ejemplo

```typescript
// tests/e2e/aum.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AUM Import Flow', () => {
  test('should upload CSV and show preview', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('apps/api/test-fixtures/aum/balanz-demo.csv');
    
    // Esperar preview
    await expect(page.locator('text=Vista previa importación')).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(10);
  });
});
```

### Comandos

```bash
# E2E tests
pnpm test:e2e              # Run todos los E2E
pnpm test:e2e:ui           # Modo UI (debugging)
pnpm test:e2e auth         # Solo tests de auth
pnpm test:e2e:report       # Ver reporte
```

---

## 🎯 Coverage Targets

### Backend (apps/api)

```javascript
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70
  }
}
```

**Objetivo:** ≥70% en todas las métricas

**Qué debe tener >90% coverage:**
- `src/utils/*` - Utilidades críticas
- `src/config/*` - Configuraciones
- `src/auth/*` - Seguridad

**Qué puede tener <50% coverage:**
- `src/routes/*` - Cubierto por E2E
- `src/index.ts` - Bootstrap
- `src/types/*` - Type definitions

### Frontend (apps/web)

```javascript
coverage: {
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60
  }
}
```

**Objetivo:** ≥60% en todas las métricas

**Qué debe tener >80% coverage:**
- `lib/api-client.ts` - Cliente API
- `lib/api-url.ts` - Utilidades
- Hooks custom (si existen)

**Qué puede tener <30% coverage:**
- `app/**/*.tsx` - Componentes (cubierto por E2E)
- Layout/pages principales

---

## 📁 Estructura de Archivos

### Backend (apps/api)

```
apps/api/
├── src/
│   ├── config/
│   │   ├── aum-limits.ts
│   │   ├── aum-limits.test.ts      ✅ Unit test
│   │   ├── timeouts.ts
│   │   └── timeouts.test.ts        ✅ Unit test
│   ├── utils/
│   │   ├── batch-validation.ts
│   │   ├── batch-validation.test.ts ✅ Unit test
│   │   ├── error-response.ts
│   │   └── error-response.test.ts   ✅ Unit test
│   └── routes/
│       └── aum.ts                   (E2E cubre endpoints)
├── vitest.config.ts                 (config Vitest)
└── test-fixtures/                   (data para tests)
    └── aum/
        └── balanz-demo.csv
```

### Frontend (apps/web)

```
apps/web/
├── lib/
│   ├── api-client.ts
│   ├── api-client.test.ts          ✅ Unit test
│   ├── api-url.ts
│   └── api-url.test.ts             ✅ Unit test
├── app/
│   └── admin/
│       └── aum/
│           ├── page.tsx            (E2E cubre componentes)
│           └── components/
└── vitest.config.ts                (config Vitest)
```

### E2E Tests

```
tests/
└── e2e/
    ├── auth.spec.ts                ✅ Playwright
    ├── contacts.spec.ts            ✅ Playwright
    └── aum.spec.ts                 ✅ Playwright (futuro)
```

---

## 🚀 Workflow de Testing

### 1. Desarrollo de Feature

```bash
# 1. Desarrollar feature con TDD
cd apps/api/src/utils
touch new-feature.ts new-feature.test.ts

# 2. Escribir unit tests primero
# new-feature.test.ts

# 3. Implementar feature
# new-feature.ts

# 4. Verificar coverage
pnpm test:coverage

# 5. Crear E2E test para flujo crítico
cd ../../../tests/e2e
touch new-feature.spec.ts
```

### 2. Pre-commit

```bash
# Automático con husky
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Unit tests (rápido)
```

### 3. CI/CD

```bash
# En GitHub Actions
pnpm test          # Unit tests (todos los workspaces)
pnpm test:e2e      # E2E tests (solo en CI)
```

---

## ✅ Checklist de Testing

### Antes de hacer PR

- [ ] Unit tests para nueva lógica de negocio
- [ ] Coverage ≥70% backend / ≥60% frontend
- [ ] E2E test para flujo crítico nuevo
- [ ] Todos los tests pasan en local
- [ ] Linter y typecheck limpios

### Al revisar PR

- [ ] Tests son legibles (describe/it claros)
- [ ] No hay tests comentados/skipped sin razón
- [ ] Tests fallan si se rompe el código
- [ ] Coverage no bajó

---

## 📚 Referencias

- **Vitest Docs:** https://vitest.dev
- **Playwright Docs:** https://playwright.dev
- **Testing Library:** https://testing-library.com

---

## 🔥 Reglas de Oro

1. **Unit test al lado del archivo** - Siempre `[file].test.ts`
2. **E2E en tests/e2e/** - Siempre `.spec.ts`
3. **NO Supertest para E2E** - Usar Playwright
4. **NO carpetas __tests__** - Tests al lado del código
5. **Coverage mínimo**: 70% backend, 60% frontend

---

**Score objetivo:** 8.5+/10 en calidad de tests

