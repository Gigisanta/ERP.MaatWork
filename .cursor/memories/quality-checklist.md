# Checklist de Calidad - MAATWORK

## Propósito
Checklist completo para asegurar calidad de código antes de commits y deploys.

## Verificaciones Pre-Commit

### Antes de cada commit

- [ ] **Typecheck:** `pnpm typecheck` - Sin errores de tipos
- [ ] **Lint:** `pnpm lint` - Sin errores de linting
- [ ] **Tests unitarios:** `pnpm test` - Todos los tests pasan
- [ ] **Build:** `pnpm build` - Build exitoso (opcional, solo si cambiaste paquetes compartidos)

### Verificaciones específicas por tipo de cambio

#### Cambios en Backend API (`apps/api/src/`)
- [ ] Todos los endpoints usan `createRouteHandler` o `createAsyncHandler` correctamente
- [ ] Todos los errores usan `HttpError` o `createErrorResponse`
- [ ] Todos los endpoints tienen validación Zod con `validate()` middleware
- [ ] No hay `console.log` en código de producción (solo scripts/tests)
- [ ] Todos los logs usan `req.log` (pino)
- [ ] RequestId incluido en respuestas de error

#### Cambios en Frontend (`apps/web/`)
- [ ] No hay `console.log` en código de producción (usar `logger`)
- [ ] Server Components no usan hooks de React
- [ ] Client Components marcados con `"use client"`
- [ ] Tipos Request/Response consistentes con backend

#### Cambios en Base de Datos (`packages/db/`)
- [ ] Migraciones generadas con `pnpm -F @maatwork/db generate`
- [ ] NO usar `drizzle-kit push` (destructivo)
- [ ] Migraciones aplicadas localmente antes de commit
- [ ] Schema cambios documentados si son breaking

#### Cambios en UI Package (`packages/ui/`)
- [ ] Exports específicos (no `export *`)
- [ ] Tipos exportados explícitamente
- [ ] Tests co-ubicados pasan
- [ ] Build exitoso: `pnpm -F @maatwork/ui build`

## Verificaciones Pre-Deploy

### Antes de deploy a producción

- [ ] **Verificación completa:** `pnpm verify:all:no-e2e`
  - Typecheck
  - Lint
  - Tests unitarios
  - Tests de integración
- [ ] **E2E Tests:** `pnpm e2e` - Tests E2E pasan (opcional, puede ser lento)
- [ ] **Dependencias:** `pnpm audit:deps` - Sin dependencias no usadas
- [ ] **Exports no usados:** `pnpm audit:unused-exports` - Sin exports muertos
- [ ] **Cobertura de tests:** `pnpm test:coverage` - Cobertura adecuada (>70% crítico)

### Checklist de código

- [ ] **TODOs:** No hay TODOs innecesarios en código de producción
- [ ] **Código muerto:** No hay código comentado sin propósito
- [ ] **Duplicación:** No hay código duplicado significativo
- [ ] **Documentación:** Decisiones no obvias documentadas con AI_DECISION
- [ ] **Imports:** Orden correcto (exteriores → internos → relativos → tipos)
- [ ] **Exports:** Exports específicos, no `export *`

### Checklist de seguridad

- [ ] **Variables de entorno:** Todas las necesarias están definidas
- [ ] **Secrets:** No hay secrets hardcodeados en código
- [ ] **Validación:** Todos los inputs validados con Zod
- [ ] **Autorización:** Endpoints protegidos con `requireAuth`/`requireRole`
- [ ] **CORS:** Configuración correcta para producción
- [ ] **CSP:** Content Security Policy configurada

### Checklist de performance

- [ ] **Queries N+1:** No hay queries N+1 en loops
- [ ] **Batch queries:** Usar `inArray` para queries en batch
- [ ] **Índices:** Queries críticas usan índices apropiados
- [ ] **Caché:** Datos que cambian poco están cacheados
- [ ] **Paginación:** Endpoints de listado usan paginación

## Estándares de Código

### Nombrado

- ✅ Variables/funciones: `camelCase`
- ✅ Componentes/tipos: `PascalCase`
- ✅ Constantes: `UPPER_SNAKE_CASE`
- ✅ Archivos componentes: `PascalCase.tsx`
- ✅ Archivos utils: `kebab-case.ts`
- ✅ Hooks: `use[Feature].ts`

### Estructura de archivos

- ✅ Rutas API: Secciones `// Zod Validation Schemas` y `// Routes`
- ✅ Orden middlewares: `requireAuth` → `validate` → `handler`
- ✅ Tests co-ubicados: `[file].test.ts`
- ✅ Tipos: Un archivo por dominio en `apps/web/types/`

### Patrones obligatorios

- ✅ **Backend:** Usar `createRouteHandler` para GET/PUT/PATCH/DELETE estándar
- ✅ **Backend:** Usar `createAsyncHandler` SOLO para casos legítimos (status 201, cookies, headers)
- ✅ **Backend:** Usar `HttpError` para errores en validaciones tempranas
- ✅ **Backend:** Usar `createErrorResponse` en catch blocks
- ✅ **Frontend:** Usar `logger` en lugar de `console.log`
- ✅ **Frontend:** Server Components para data fetching, Client Components para interactividad

## Anti-Patterns a Evitar

### Backend
- ❌ `fetch` manual sin cliente centralizado
- ❌ Sin validación de inputs (usar Zod)
- ❌ `console.log` en producción (usar `req.log`)
- ❌ Queries N+1 en loops (usar batch queries)
- ❌ Manejar `ZodError` manualmente (usar middleware)

### Frontend
- ❌ `window.location` en Next.js (usar `useRouter`)
- ❌ `alert()` / `confirm()` nativos (usar Toast/Modal)
- ❌ `fetch` manual (usar `apiClient`)
- ❌ Server Components con hooks de React
- ❌ `console.log` en producción (usar `logger`)

### General
- ❌ Tipos `any` sin justificación
- ❌ Shadowing de funciones importadas
- ❌ Definir tipos duplicados (reutilizar)
- ❌ Magic numbers (usar constantes)
- ❌ `export *` (usar exports específicos)

## Comandos Rápidos

```bash
# Verificación completa (sin E2E)
pnpm verify:all:no-e2e

# Verificación completa (con E2E)
pnpm verify:all

# Solo typecheck
pnpm typecheck

# Solo lint
pnpm lint

# Solo tests
pnpm test

# Cobertura de tests
pnpm test:coverage

# Auditoría de dependencias
pnpm audit:deps

# Auditoría de exports no usados
pnpm audit:unused-exports
```

## Referencias

- [Reglas del proyecto](../rules/README.md)
- [Guía de desarrollo](../../docs/DEVELOPMENT.md)
- [Arquitectura](../../docs/ARCHITECTURE.md)
- [Flujos de trabajo comunes](./common-workflows.md)





































