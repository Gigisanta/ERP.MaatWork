# Ejecución: Consistencia y Estandarización del Repositorio

**INSTRUCCIÓN PRINCIPAL:** Ejecuta directamente las siguientes tareas. NO generes un plan, ejecuta las acciones paso a paso. Investiga el código, identifica problemas y corrígelos inmediatamente.

---

## FASE 1: Detección y Análisis (Ejecutar primero)

### 1.1 Detectar Exports No Usados
**ACCIÓN:** Ejecuta `pnpm audit:unused-exports` y analiza cada resultado.

Para cada export no usado encontrado:
1. Verifica si realmente no se usa (busca en todo el repo con grep)
2. Si no se usa y no es necesario, elimínalo inmediatamente
3. Si falta un import, corrígelo
4. Si es usado solo en tests, evalúa si el test es necesario

**Áreas a revisar:**
- `apps/api/src/utils/` - Elimina utilities no usadas
- `apps/web/lib/` - Elimina funciones API no usadas  
- `packages/ui/src/` - Verifica exports de componentes
- `packages/db/src/` - Verifica schemas/tipos no usados

### 1.2 Detectar Dependencias No Usadas
**ACCIÓN:** Ejecuta `pnpm audit:deps` en cada workspace y elimina dependencias no usadas.

Para cada dependencia reportada:
1. Verifica que no sea peer dependency
2. Verifica que no se use indirectamente
3. Si realmente no se usa, elimínala del `package.json`
4. Ejecuta `pnpm install` para actualizar lockfile

**Workspaces a revisar:**
- `apps/api/package.json`
- `apps/web/package.json`
- `packages/ui/package.json`
- `packages/db/package.json`

### 1.3 Buscar y Limpiar TODOs Obsoletos
**ACCIÓN:** Busca todos los TODOs/FIXMEs y evalúa cada uno.

```bash
grep -r "TODO\|FIXME\|XXX\|HACK" apps/ packages/ --include="*.ts" --include="*.tsx"
```

Para cada TODO encontrado:
1. Lee el contexto completo
2. Si está resuelto o es obsoleto, elimínalo
3. Si es relevante pero sin contexto, agrega contexto claro
4. Si es un TODO válido, déjalo pero mejora su descripción

### 1.4 Detectar Código Duplicado
**ACCIÓN:** Busca funciones similares y consolídalas.

**Buscar duplicados en:**
- Validaciones de UUID (deben usar `uuidSchema` de `common-schemas.ts`)
- Validaciones de email (deben usar `emailSchema` o `optionalEmailSchema`)
- Paginación (deben usar `paginationQuerySchema` y `parsePaginationQuery()`)
- Manejo de errores (deben usar `createErrorResponse` o `ApiError`)
- Logging (backend: `req.log`, frontend: logger de `lib/logger.ts`)

**Acción:** Para cada duplicado encontrado, reemplázalo por la función centralizada.

### 1.5 Verificar Patrones de Código
**ACCIÓN:** Verifica y corrige inconsistencias inmediatamente.

**Rutas API - Verificar que todas usen:**
- `validate()` middleware para validación Zod
- `createRouteHandler()` o `createAsyncHandler()` para errores
- `requireAuth` o `requireRole` para autenticación

**Si encuentras rutas que no siguen el patrón, corrígelas ahora.**

**Console.log - Buscar y reemplazar:**
```bash
grep -r "console\.log" apps/api/src/routes/ --include="*.ts"
grep -r "console\.log" apps/web/app/ --include="*.tsx" --include="*.ts"
```

- Backend: Reemplaza `console.log` por `req.log` (Pino)
- Frontend: Reemplaza `console.log` por logger de `lib/logger.ts` (excepto en desarrollo/debug)
- Scripts: Mantén `console.log` solo si es output esperado

**Export * from - Buscar y corregir:**
```bash
grep -r "export \* from" apps/ packages/ --include="*.ts" --include="*.tsx"
```

Reemplaza todos los `export * from` con exports específicos.

---

## FASE 2: Limpieza Inmediata

### 2.1 Eliminar Archivos Completamente No Usados
**ACCIÓN:** Para cada archivo que no tenga imports ni exports usados, elimínalo.

1. Verifica que el archivo no se use en ningún lugar
2. Verifica que no sea usado en tests
3. Si no se usa, elimínalo
4. Actualiza cualquier referencia si es necesario

### 2.2 Consolidar Validaciones Duplicadas
**ACCIÓN:** Busca validaciones custom duplicadas y consolídalas.

1. Busca validaciones de UUID que no usen `uuidSchema`
2. Busca validaciones de email que no usen `emailSchema`
3. Busca validaciones de paginación que no usen `paginationQuerySchema`
4. Reemplaza todas por los schemas centralizados
5. Si hay validaciones custom legítimas, muévelas a `common-schemas.ts` o `validation-common.ts`

### 2.3 Consolidar Manejo de Errores
**ACCIÓN:** Verifica que todos los endpoints usen el patrón correcto.

**Backend:**
1. Busca endpoints que no usen `createRouteHandler()` o `createAsyncHandler()`
2. Busca try/catch manuales que duplican lógica
3. Reemplaza por `createRouteHandler()` o `createAsyncHandler()`
4. Verifica que todos los errores usen `createErrorResponse()` o `HttpError`

**Frontend:**
1. Busca manejo de errores que no use `ApiError` de `lib/api-error.ts`
2. Reemplaza por `ApiError` con manejo apropiado

### 2.4 Consolidar Logging
**ACCIÓN:** Reemplaza todos los `console.log` por logging apropiado.

**Backend (`apps/api/src/routes/`):**
- Reemplaza `console.log` → `req.log.info()`
- Reemplaza `console.error` → `req.log.error()`
- Reemplaza `console.warn` → `req.log.warn()`

**Frontend (`apps/web/app/` y `apps/web/lib/`):**
- Reemplaza `console.log` → `logger.info()` (de `lib/logger.ts`)
- Reemplaza `console.error` → `logger.error()`
- Mantén `console.log` solo en componentes de debug o desarrollo

---

## FASE 3: Estandarización

### 3.1 Estandarizar Estructura de Rutas API
**ACCIÓN:** Revisa cada archivo en `apps/api/src/routes/` y estandariza.

**Patrón obligatorio:**
```typescript
// ==========================================================
// Zod Validation Schemas
// ==========================================================
const createSchema = z.object({ ... });

// ==========================================================
// Routes
// ==========================================================
router.post('/',
  requireAuth,
  validate({ body: createSchema }),
  createRouteHandler(async (req) => {
    // lógica
    return result;
  })
);
```

**Para cada ruta que no siga este patrón, corrígela.**

### 3.2 Estandarizar Imports
**ACCIÓN:** Verifica orden y formato de imports en archivos modificados.

**Orden correcto:**
1. Imports externos (node_modules)
2. Imports internos (@cactus/*)
3. Imports relativos (./, ../)

**Usar `import type` cuando sea posible:**
```typescript
import type { Request, Response } from 'express';
import { z } from 'zod';
```

### 3.3 Estandarizar Nombrado
**ACCIÓN:** Verifica convenciones de nombres y corrige.

- Variables/funciones: `camelCase`
- Componentes/tipos: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Archivos componentes: `PascalCase.tsx`
- Archivos utils: `kebab-case.ts`

**Evitar shadowing:** Usa prefijos `handle`, `do`, `perform` para funciones que podrían hacer shadow de imports.

### 3.4 Estandarizar Documentación
**ACCIÓN:** Agrega documentación donde falte.

**Agregar JSDoc a:**
- Funciones complejas (más de 20 líneas)
- Funciones públicas exportadas
- Tipos/interfaces complejos

**Agregar comentarios AI_DECISION a:**
- Decisiones no obvias
- Patrones que podrían ser cuestionados
- Optimizaciones importantes

---

## FASE 4: Verificación y Corrección

### 4.1 Verificar TypeScript
**ACCIÓN:** Ejecuta `pnpm typecheck` y corrige todos los errores.

1. Ejecuta `pnpm typecheck`
2. Para cada error, corrígelo inmediatamente
3. Verifica que no haya warnings importantes
4. Repite hasta que `typecheck` pase sin errores

### 4.2 Verificar Linting
**ACCIÓN:** Ejecuta `pnpm lint` y corrige todos los errores.

1. Ejecuta `pnpm lint`
2. Para cada error, corrígelo inmediatamente
3. Verifica que no haya warnings importantes
4. Repite hasta que `lint` pase sin errores

### 4.3 Ejecutar Tests
**ACCIÓN:** Ejecuta `pnpm test` y corrige tests rotos.

1. Ejecuta `pnpm test`
2. Si algún test falla por tus cambios:
   - Si el cambio es correcto, actualiza el test
   - Si el cambio rompe funcionalidad, revierte el cambio
3. Verifica que todos los tests pasen

### 4.4 Verificar Build
**ACCIÓN:** Ejecuta `pnpm build` y corrige errores.

1. Ejecuta `pnpm build`
2. Corrige cualquier error de build
3. Verifica que los bundles se generen correctamente

### 4.5 Verificación Final Completa
**ACCIÓN:** Ejecuta verificación completa.

```bash
pnpm verify:all:no-e2e
```

Si hay errores, corrígelos. No consideres el trabajo completo hasta que esta verificación pase.

---

## REGLAS CRÍTICAS DURANTE LA EJECUCIÓN

1. **NO elimines código sin verificar:** Siempre busca con grep antes de eliminar
2. **NO rompas compatibilidad:** Si eliminas una función pública, verifica que no se use en otros workspaces
3. **Ejecuta tests después de cambios grandes:** No esperes al final
4. **Haz commits incrementales:** Commitea por fase para facilitar rollback
5. **Documenta decisiones no obvias:** Usa comentarios `AI_DECISION` con justificación

---

## CHECKLIST FINAL (Antes de terminar)

Verifica que TODOS estos pasen:

- [ ] `pnpm typecheck` pasa sin errores
- [ ] `pnpm lint` pasa sin errores  
- [ ] `pnpm test` pasa sin errores
- [ ] `pnpm build` pasa sin errores
- [ ] `pnpm verify:all:no-e2e` pasa sin errores
- [ ] No hay código muerto (verificado con `audit:unused-exports`)
- [ ] No hay dependencias no usadas (verificado con `audit:deps`)
- [ ] No hay TODOs obsoletos
- [ ] No hay `console.log` en producción (excepto scripts)
- [ ] No hay `export * from` (prohibido)
- [ ] Todas las rutas usan `createRouteHandler()` o `createAsyncHandler()`
- [ ] Todas las rutas usan `validate()` middleware
- [ ] Todos los errores usan `createErrorResponse()` o `ApiError`

**Solo cuando TODOS los checks pasen, el trabajo está completo.**