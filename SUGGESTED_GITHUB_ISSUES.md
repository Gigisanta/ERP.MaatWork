# 🎫 GitHub Issues Sugeridos - Limpieza Técnica

Basado en la auditoría de codebase realizada el 2025-11-01.

---

## 🔴 Crítico

### Issue #1: Completar o Remover Feature: Tag Rules & Segments

**Labels:** `critical`, `feature`, `technical-debt`  
**Milestone:** Sprint actual  
**Estimado:** 3 días

**Descripción:**
La feature de Tag Rules y Segments está parcialmente implementada con feature flag `TAGS_RULES_ENABLED=false`.

**Estado actual:**
- ✅ DB schema completo
- ✅ Endpoints CRUD básicos
- ❌ Lógica de evaluación (mock/incompleta)
- ❌ Feature flag desactivado

**Archivos afectados:**
- `apps/api/src/routes/tags.ts`
  - Línea 580: `TODO: Implementar evaluación real de reglas`
  - Línea 686: `TODO: Implementar evaluación real de filtros`
  - Línea 691: `TODO: debe respetar accessFilter.whereClause`

**Endpoints afectados:**
- `POST /tag-rules/:id/evaluate` - Retorna 501
- `POST /segments/:id/refresh` - Retorna 501

**Opciones:**

**A. Completar implementación** (Recomendado si es feature prioritaria)
- [ ] Implementar evaluador de reglas con filtros dinámicos
- [ ] Respetar `accessFilter.whereClause` para data isolation
- [ ] Agregar tests para lógica de evaluación
- [ ] Habilitar `TAGS_RULES_ENABLED=true`
- [ ] Documentar uso en README

**B. Remover feature** (Recomendado si no es prioritaria)
- [ ] Remover endpoints evaluate/refresh
- [ ] Remover feature flag `TAGS_RULES_ENABLED`
- [ ] Mantener CRUD básico (crear reglas sin evaluación)
- [ ] Documentar como roadmap para futuro

**C. Documentar como "Coming Soon"**
- [ ] Agregar banner en UI indicando "En desarrollo"
- [ ] Documentar en roadmap con fecha estimada
- [ ] Mantener endpoints con 501 y mensaje claro

---

### Issue #2: Eliminar Pool Manual Duplicado en AUM Routes

**Labels:** `critical`, `bug`, `technical-debt`  
**Milestone:** Sprint actual  
**Estimado:** 1 día

**Descripción:**
Existe un Pool de PostgreSQL manual que duplica la funcionalidad de Drizzle, causando riesgo de pool exhaustion.

**Archivos afectados:**
- `apps/api/src/routes/aum.ts`
  - Líneas 78-85: Pool manual
  - Línea ~784: Uso del pool
  - Líneas 298-335: `ensureAumTables()` (también debe eliminarse)
  - Líneas 410-418: Llamadas a `ensureAumTables()`

**AI_DECISION ya documenta:**
```typescript
// AI_DECISION: Eliminar Pool manual - usar solo Drizzle
// Justificación: Drizzle ya maneja conexiones con pool interno, 
//                duplicar pool causa problemas
// Impacto: Mejor gestión de conexiones, sin riesgo de pool exhaustion
```

**Checklist:**
- [ ] Eliminar `let _rawPool: Pool | null = null`
- [ ] Eliminar `function getRawPool(): Pool { ... }`
- [ ] Eliminar `import { Pool } from 'pg'`
- [ ] Reemplazar uso en línea ~784 con Drizzle query builder
- [ ] Eliminar función `ensureAumTables()` completa
- [ ] Eliminar llamadas a `ensureAumTables()`
- [ ] Verificar que migraciones Drizzle crean todas las tablas necesarias
- [ ] Tests de integración para endpoints AUM

**Referencias:**
- `scripts/cleanup-administration-center.sh` - Checklist existente
- `CODEBASE_AUDIT_REPORT.md` - Sección "Pool Manual Duplicado"

---

### Issue #3: Migrar console.log a Logger Estructurado en Runtime

**Labels:** `high`, `observability`, `technical-debt`  
**Milestone:** Próximo sprint  
**Estimado:** 2 días

**Descripción:**
Hay 130+ instancias de `console.log/console.warn` en la codebase. La mayoría están en scripts (aceptable), pero algunas están en código de runtime de producción.

**Archivos críticos a migrar:**

**Frontend:**
```typescript
// apps/web/app/contacts/new/page.tsx:178
console.log('[Contact Creation] Contact created successfully:', {...});
console.warn('[Contact Creation] WARNING: Advisor created contact...');
```
**Reemplazar con:**
```typescript
import { logger } from '@/lib/logger';
logger.info('[Contact Creation] Contact created successfully:', {...});
logger.warn('[Contact Creation] WARNING: Advisor created contact...');
```

**Backend:**
```typescript
// apps/api/src/config/timeouts.ts:125
console.warn('⚠️  Timeout configuration warnings:');
```
**Reemplazar con:**
```typescript
logger.warn('Timeout configuration warnings:', { warnings: validation.warnings });
```

```typescript
// apps/api/src/auth/authorization.ts:58
console.warn(`Manager ${userId} has no team members...`);
```
**Reemplazar con:**
```typescript
req.log.warn({ userId, error }, 'Manager has no team members or team setup issue');
```

**Archivos a NO tocar (aceptables):**
- ✅ `apps/api/src/scripts/*.ts` - Scripts de inicialización
- ✅ `apps/api/src/add-*.ts` - Scripts de setup
- ✅ `packages/db/src/seed*.ts` - Seeds
- ✅ `packages/db/src/tools/*.ts` - Herramientas CLI

**Checklist:**
- [ ] `apps/web/app/contacts/new/page.tsx`
- [ ] `apps/api/src/config/timeouts.ts`
- [ ] `apps/api/src/auth/authorization.ts`
- [ ] `apps/api/src/config/env.ts` (console.warn)
- [ ] Auditar otros archivos en `apps/web/app/**/*.tsx`
- [ ] Agregar lint rule para prevenir nuevos console.* (excepto scripts)

---

### Issue #4: Clarificar Arquitectura: Portfolio Templates vs Epic-D

**Labels:** `high`, `documentation`, `architecture`  
**Milestone:** Próximo sprint  
**Estimado:** 4 horas

**Descripción:**
Existe ambigüedad sobre si "Portfolio Templates" es un sistema legacy o activo.

**Contexto:**
Según `.cursorrules`:
> **Nota:** El proyecto contiene dos dominios:
> - **CRM (Legacy)**: Contactos, pipeline, tags
> - **Portfolio/Analytics (Epic-D)**: Portfolios, benchmarks, instrumentos financieros

Pero "Portfolio Templates" parece estar en ambos:
- ✅ Implementación completa en backend
- ✅ Frontend activo en `apps/web/app/portfolios/`
- ✅ Usado en asignación de contactos
- ❓ No está claro si coexiste con Epic-D o debe migrarse

**Archivos afectados:**
- Backend: `apps/api/src/routes/portfolio.ts` (400 líneas)
- Frontend: `apps/web/app/portfolios/` (múltiples archivos)
- DB: `portfolioTemplates`, `portfolioTemplateLines`, `clientPortfolioAssignments`

**Decisiones requeridas:**

1. **¿Portfolio Templates es legacy o activo?**
   - [ ] Activo - mantener y documentar
   - [ ] Legacy - planificar migración a Epic-D
   - [ ] Coexisten - documentar casos de uso

2. **¿Qué es qué?**
   - [ ] Documentar diferencia entre "Templates" vs "Portfolios" vs "Benchmarks"
   - [ ] Clarificar flujo: ¿Template → Portfolio → Contacto?
   - [ ] Actualizar `ARCHITECTURE.md` con diagrama

3. **Si coexisten:**
   - [ ] Documentar cuándo usar uno u otro
   - [ ] Renombrar para evitar confusión
   - [ ] Agregar comentarios en código explicando relación

**Entregables:**
- [ ] Actualizar `.cursorrules` con clarificación
- [ ] Actualizar `ARCHITECTURE.md` con sección "Portfolio Systems"
- [ ] Agregar comentario AI_DECISION en `portfolio.ts` explicando arquitectura
- [ ] Diagrama simple en Mermaid o ASCII

---

## 🟡 Alto

### Issue #5: Migrar Fetch Directo a API Client Centralizado

**Labels:** `high`, `refactor`, `technical-debt`  
**Milestone:** Próximo sprint  
**Estimado:** 5 días

**Descripción:**
Varios componentes de admin/AUM usan `fetch()` directo en lugar del cliente API centralizado, violando el patrón establecido en `.cursorrules`.

**Anti-pattern actual:**
```typescript
const response = await fetch(`${apiUrl}/portfolios/templates/${id}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

**Patrón correcto:**
```typescript
import { api } from '@/lib/api-client';
const response = await api.get(`/portfolios/templates/${id}`);
// Retry automático, refresh token, error handling, timeout incluido
```

**Archivos afectados (7):**
- [ ] `apps/web/app/admin/aum/page.tsx`
- [ ] `apps/web/app/admin/aum/history/page.tsx`
- [ ] `apps/web/app/admin/aum/[fileId]/page.tsx`
- [ ] `apps/web/app/admin/aum/components/FileUploader.tsx`
- [ ] `apps/web/app/admin/aum/components/ContactUserPicker.tsx`
- [ ] `apps/web/app/admin/aum/components/DuplicateResolutionModal.tsx`
- [ ] `apps/web/app/admin/aum/components/RowMatchForm.tsx`
- [ ] `apps/web/app/portfolios/[id]/page.tsx` (templates)

**Beneficios:**
- ✅ Retry automático en errores 5xx
- ✅ Refresh token automático en 401
- ✅ Timeout configurable
- ✅ Error handling consistente
- ✅ Headers automáticos (Authorization)

**Checklist:**
1. [ ] Crear métodos en `lib/api/` para cada dominio:
   - [ ] `lib/api/aum.ts` - Métodos AUM
   - [ ] `lib/api/portfolios.ts` - Agregar métodos templates
2. [ ] Migrar componentes uno por uno
3. [ ] Tests para cada método API
4. [ ] Verificar que error handling funciona correctamente
5. [ ] Remover código de fetch directo

---

### Issue #6: Actualizar Dependencias npm Deprecadas

**Labels:** `medium`, `dependencies`, `maintenance`  
**Milestone:** Backlog  
**Estimado:** 3 días

**Descripción:**
Múltiples dependencias npm están deprecadas según `pnpm-lock.yaml`.

**Dependencias afectadas:**

1. **@tsconfig/node18** 
   - Deprecado: Merged into tsx
   - Acción: Revisar si es necesario

2. **@types/uuid**
   - Deprecado: uuid provides own types
   - Acción: Remover

3. **glob < v9**
   - Deprecado: Upgrade to v9+
   - Acción: Actualizar y verificar breaking changes

4. **inflight**
   - Deprecado: Memory leak, use lru-cache
   - Acción: Verificar si es dependencia transitiva

5. **rimraf < v4**
   - Deprecado: Upgrade to v4+
   - Acción: Actualizar

6. **domexception**
   - Deprecado: Use native DOMException
   - Acción: Remover si no es transitiva

**Checklist:**
- [ ] Auditar dependencias con `pnpm audit`
- [ ] Actualizar con `pnpm update --latest --recursive`
- [ ] Revisar breaking changes de cada paquete
- [ ] Tests completos después de actualizar
- [ ] Documentar cambios en CHANGELOG

**Riesgo:** Medio - Puede introducir breaking changes

---

### Issue #7: Remover Código Deprecado (Validation Aliases)

**Labels:** `medium`, `technical-debt`, `breaking-change`  
**Milestone:** Próximo major version  
**Estimado:** 2 días

**Descripción:**
Existen aliases de compatibilidad deprecados que deben removerse en próxima versión major.

**Archivos afectados:**

```typescript
// apps/api/src/utils/validation.ts
/**
 * @deprecated Import directly from '../utils/common-schemas' instead
 */
export { uuidSchema, paginationQuerySchema, idParamSchema, fileIdParamSchema } 
  from './common-schemas';

// apps/api/src/utils/common-schemas.ts:172
/**
 * @deprecated Use paginationQuerySchema instead
 */
export const listQuerySchema = paginationQuerySchema;
```

**Plan de migración:**

**Fase 1: Auditar uso**
- [ ] Buscar imports de `validation.ts` en toda la codebase
- [ ] Buscar uso de `listQuerySchema`
- [ ] Documentar todos los archivos afectados

**Fase 2: Migrar imports**
- [ ] Reemplazar imports de `validation.ts` con `common-schemas.ts`
- [ ] Reemplazar `listQuerySchema` con `paginationQuerySchema`
- [ ] Verificar tests

**Fase 3: Remover aliases**
- [ ] Remover exports deprecados de `validation.ts`
- [ ] Remover `listQuerySchema` alias
- [ ] Actualizar imports en archivos que aún usen el antiguo path
- [ ] Incrementar versión major en package.json

**Nota:** Esta es una breaking change, debe hacerse en major version bump.

---

### Issue #8: Priorizar y Resolver TODOs Críticos

**Labels:** `medium`, `todo`, `technical-debt`  
**Milestone:** Backlog  
**Estimado:** Variable

**Descripción:**
Se encontraron 60+ TODOs en la codebase. Priorizar los críticos y convertir en issues.

**TODOs críticos identificados:**

1. **Recurrencia de tareas** (Alta prioridad)
```typescript
// apps/api/src/routes/tasks.ts:360
// TODO: Calcular siguiente ocurrencia usando rrule library
```
- [ ] Investigar librería `rrule`
- [ ] Implementar cálculo de recurrencia
- [ ] Tests para todas las frecuencias (daily, weekly, monthly, yearly)

2. **Cliente Python mejorado** (Media prioridad)
```python
# apps/analytics-service/yfinance_client_improved.py:277
# TODO: Copiar desde el archivo original
```
- [ ] Completar migración de `yfinance_client.py` a `yfinance_client_improved.py`
- [ ] O eliminar archivo si no se usa

3. **Documentación de endpoints** (Baja prioridad)
```typescript
// Múltiples archivos con comentarios "Obtener todos..."
// Más documentación que TODO real
```
- [ ] Auditar y actualizar comentarios
- [ ] Generar documentación OpenAPI

**Proceso:**
- [ ] Categorizar TODOs por prioridad
- [ ] Crear GitHub Issue para cada TODO crítico
- [ ] Remover TODOs obsoletos o innecesarios
- [ ] Establecer convención: TODOs deben tener Issue asociado

---

## 🟢 Bajo

### Issue #9: Parametrizar Script de Asignación de Contactos

**Labels:** `low`, `enhancement`, `developer-experience`  
**Milestone:** Backlog  
**Estimado:** 1 hora

**Descripción:**
Script tiene nombre de usuario hardcodeado, debería aceptar parámetro.

**Archivo:** `apps/api/src/scripts/assign-unassigned-contacts.ts`

**Cambio propuesto:**

```typescript
// Antes:
console.log('\n🔍 Buscando usuario "giolivo santarelli"...\n');

// Después:
const targetUser = process.argv[2];
if (!targetUser) {
  console.error('❌ Error: Debes proporcionar un nombre de usuario');
  console.log('Uso: pnpm run assign-unassigned-contacts "Nombre Usuario"');
  process.exit(1);
}
console.log(`\n🔍 Buscando usuario "${targetUser}"...\n`);
```

**Uso mejorado:**
```bash
pnpm -F @cactus/api run assign-unassigned-contacts "giolivo santarelli"
```

**Checklist:**
- [ ] Agregar argumento CLI
- [ ] Validar argumento requerido
- [ ] Actualizar documentación en README
- [ ] Agregar help message con `--help`

---

### Issue #10: Limpiar Líneas Vacías en Nav.tsx

**Labels:** `low`, `code-quality`, `nitpick`  
**Milestone:** Backlog  
**Estimado:** 5 minutos

**Descripción:**
Archivo tiene líneas vacías al final.

**Archivo:** `packages/ui/src/components/nav/Nav.tsx`

**Líneas 82-85:**
```typescript
Nav.displayName = 'Nav';




```

**Solución:**
- [ ] Remover líneas vacías
- [ ] Configurar prettier con `trimTrailingWhitespace: true`
- [ ] Configurar eslint rule `no-multiple-empty-lines`
- [ ] Correr `pnpm format` en todo el proyecto

---

## 📊 Resumen de Issues

| Prioridad | Cantidad | Estimado Total |
|-----------|----------|----------------|
| 🔴 Crítico | 4 | 8.5 días |
| 🟡 Alto | 4 | 12 días |
| 🟢 Bajo | 2 | 1 hora |
| **TOTAL** | **10** | **~4 semanas** |

---

## 🎯 Sprint Sugerido

### Sprint 1 (2 semanas) - Crítico
- Issue #2: Eliminar Pool manual (1d)
- Issue #1: Tag Rules decisión + implementación (3d)
- Issue #3: Migrar console.log (2d)
- Issue #4: Documentar arquitectura (0.5d)
- Buffer: 3.5 días

### Sprint 2 (2 semanas) - Alto
- Issue #5: Migrar a API client (5d)
- Issue #6: Actualizar dependencias (3d)
- Issue #7: Remover deprecados (2d)
- Buffer: 4 días

### Backlog
- Issue #8: Resolver TODOs (variable)
- Issue #9: Parametrizar script (1h)
- Issue #10: Limpiar Nav.tsx (5min)

---

## 📝 Notas

- Todos los issues están priorizados según impacto en producción
- Estimados son conservadores, incluyen testing
- Se recomienda hacer code review exhaustivo en issues críticos
- Algunos issues pueden hacerse en paralelo

**Siguiente paso:** Crear estos issues en GitHub y asignar al equipo.

