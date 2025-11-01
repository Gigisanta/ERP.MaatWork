# 🔍 Reporte de Auditoría de Codebase - CACTUS CRM

**Fecha:** 2025-11-01  
**Tipo:** Auditoría de código legacy, features no usadas, TODOs y deuda técnica  
**Scope:** Monorepo completo

---

## 📊 Resumen Ejecutivo

Se encontraron **múltiples áreas de mejora** en la codebase:

- ✅ **Código bien estructurado** en general con buenas prácticas
- ⚠️ **60+ TODOs/FIXMEs** pendientes
- 🚨 **Features incompletas** con evaluación mock
- 🔴 **130+ console.log** en lugar de logger estructurado
- ⚠️ **Código deprecado** con aliases de compatibilidad
- 🟡 **Portfolio Templates** - Feature legacy con uso limitado
- 🔴 **Pool manual en AUM** - duplicación innecesaria

---

## 🚨 Crítico - Requiere Acción Inmediata

### 1. Feature Incompleta: Tag Rules y Segments (TAGS_RULES_ENABLED)

**Ubicación:** `apps/api/src/routes/tags.ts`

**Problema:**
- Feature flag `TAGS_RULES_ENABLED` desactivada por defecto
- Endpoints retornan 501 (Not Implemented)
- TODOs indican evaluación mock/incompleta

```typescript
// Línea 580
// TODO: Implementar evaluación real de reglas
const matchedContactIds: string[] = [];

// Línea 686
// TODO: Implementar evaluación real de filtros

// Línea 691
// Mock: agregar algunos contactos (TODO: debe respetar accessFilter.whereClause)
```

**Impacto:**
- Endpoints `/tag-rules/:id/evaluate` y `/segments/:id/refresh` no funcionales
- Feature completa en DB schema pero sin implementación

**Recomendación:**
- [ ] **OPCIÓN A:** Completar implementación de evaluación de reglas
- [ ] **OPCIÓN B:** Remover endpoints y feature flag si no es prioritario
- [ ] **OPCIÓN C:** Documentar como "Roadmap feature" con fecha estimada

---

### 2. Pool Manual Duplicado en AUM Routes

**Ubicación:** `apps/api/src/routes/aum.ts` (líneas 78-85)

**Problema:**
```typescript
// AI_DECISION comentario indica que esto debe eliminarse
// Drizzle ya maneja pool interno, esto causa duplicación
let _rawPool: Pool | null = null;
function getRawPool(): Pool { ... }
```

**Impacto:**
- Riesgo de pool exhaustion
- Gestión de conexiones duplicada
- Va contra la arquitectura definida (solo Drizzle)

**Acción requerida:**
✅ Ya hay comentario AI_DECISION indicando que debe eliminarse
⚠️ **Pendiente eliminar código**

**Checklist según `cleanup-administration-center.sh`:**
- [ ] Eliminar Pool manual (líneas 78-85)
- [ ] Eliminar import `import { Pool } from 'pg'`
- [ ] Reemplazar uso en línea ~784 con Drizzle query builder
- [ ] Eliminar `ensureAumTables()` (líneas 298-335 y llamadas 410-418)

---

### 3. Console.log en Producción (130+ instancias)

**Problema:**
Se encontraron **130+ console.log/console.warn** en lugar de logger estructurado:

**Ubicaciones principales:**
- `apps/api/src/scripts/*.ts` - Scripts de inicialización (aceptable)
- `apps/api/src/add-*.ts` - Scripts de setup (aceptable)  
- `packages/db/src/seed*.ts` - Seeds (aceptable)
- ❌ `apps/web/app/contacts/new/page.tsx` - **Cliente en producción**
- ❌ `apps/api/src/config/timeouts.ts` - **Código de runtime**
- ❌ `apps/api/src/auth/authorization.ts` - **Lógica de negocio**

**Ejemplos críticos:**

```typescript
// apps/web/app/contacts/new/page.tsx:178
console.log('[Contact Creation] Contact created successfully:', {...});
console.warn('[Contact Creation] WARNING: Advisor created contact...');

// apps/api/src/config/timeouts.ts:125
console.warn('⚠️  Timeout configuration warnings:');

// apps/api/src/auth/authorization.ts:58
console.warn(`Manager ${userId} has no team members...`);
```

**Recomendación:**
- [ ] Reemplazar con `req.log` en API (pino)
- [ ] Reemplazar con `logger` en cliente (frontend logger)
- [ ] Mantener console.* SOLO en scripts de inicialización/seeds

---

## ⚠️ Alto - Deuda Técnica

### 4. Código Deprecado con Aliases de Compatibilidad

**Ubicación:** `apps/api/src/utils/validation.ts` y `common-schemas.ts`

**Problema:**
```typescript
// validation.ts
/**
 * @deprecated Import directly from '../utils/common-schemas' instead
 */
export { uuidSchema } from './common-schemas';

// common-schemas.ts:172
// Legacy Compatibility Aliases
/**
 * @deprecated Use paginationQuerySchema instead
 */
export const listQuerySchema = paginationQuerySchema;
```

**Impacto:**
- Código funcional pero confunde a nuevos desarrolladores
- Imports duplicados en algunos archivos

**Recomendación:**
- [ ] Auditar uso de exports deprecados
- [ ] Migrar a imports actualizados
- [ ] Remover aliases legacy en próximo major version

---

### 5. Dependencias npm Deprecadas

**Encontradas en pnpm-lock.yaml:**

```yaml
@tsconfig/node18:
  deprecated: 'Merged into tsx: https://tsx.is'

@types/uuid:
  deprecated: uuid provides its own type definitions

glob (< v9):
  deprecated: Glob versions prior to v9 are no longer supported

inflight:
  deprecated: This module leaks memory. Use lru-cache

rimraf (< v4):
  deprecated: Rimraf versions prior to v4 are no longer supported

domexception:
  deprecated: Use your platform's native DOMException
```

**Recomendación:**
- [ ] Actualizar dependencias deprecadas
- [ ] Correr `pnpm update --latest --recursive`
- [ ] Verificar breaking changes antes de actualizar

---

### 6. Portfolio Templates - Feature Legacy con Uso Limitado

**Ubicación:** 
- Backend: `apps/api/src/routes/portfolio.ts` (líneas 21-398)
- Frontend: `apps/web/app/portfolios/` 
- DB: `portfolioTemplates`, `portfolioTemplateLines`, `clientPortfolioAssignments`

**Análisis:**
- ✅ Feature completa en backend con todos los CRUD
- ✅ Frontend usa templates en vista de portfolios
- ⚠️ Se mezcla con sistema nuevo de Epic-D (benchmarks, instrumentos)
- ❓ No está claro si es sistema legacy o activo

**Endpoints existentes:**
```
GET    /portfolios/templates
POST   /portfolios/templates
PUT    /portfolios/templates/:id
GET    /portfolios/templates/lines/batch
GET    /portfolios/templates/:id/lines
POST   /portfolios/templates/:id/lines
DELETE /portfolios/templates/:id/lines/:lineId
```

**Uso en frontend:**
- `apps/web/app/portfolios/page.tsx` - Lista y CRUD de templates
- `apps/web/app/portfolios/[id]/page.tsx` - Detalle de template individual
- `apps/web/app/contacts/[id]/PortfolioSection.tsx` - Asignación a contactos

**Recomendación:**
- [ ] **Clarificar:** ¿Es sistema legacy o activo?
- [ ] **Documentar:** Relación entre templates (CRM) vs portfolios (Epic-D)
- [ ] **Decisión:** Mantener ambos sistemas o migrar a uno solo

**Notas de `.cursorrules`:**
> **Nota:** El proyecto contiene dos dominios:
> - **CRM (Legacy)**: Contactos, pipeline, tags
> - **Portfolio/Analytics (Epic-D)**: Portfolios, benchmarks, instrumentos financieros

Parece que "Portfolio Templates" es parte del CRM Legacy, pero sigue siendo usado activamente.

---

## 🟡 Medio - Mejoras Recomendadas

### 7. TODOs y FIXMEs Pendientes (60+)

**Por categoría:**

#### A. Features Incompletas
```typescript
// apps/api/src/routes/tasks.ts:360
// TODO: Calcular siguiente ocurrencia usando rrule library

// apps/analytics-service/yfinance_client_improved.py:277
# TODO: Copiar desde el archivo original
```

#### B. Lógica de Negocio Pendiente
```typescript
// apps/api/src/routes/contacts.ts:308
// Para ver contactos de otros usuarios (miembros del equipo), 
// debe usar /contacts?advisorId=xxx explícitamente
```

#### C. Optimizaciones Identificadas
```typescript
// apps/api/src/routes/portfolio.ts:192
// Obtener todas las líneas de todos los portfolios en una sola query

// apps/api/src/routes/benchmarks.ts:93
// Obtener todos los componentes de todos los benchmarks en una sola query
```

**Recomendación:**
- [ ] Priorizar TODOs por impacto en negocio
- [ ] Convertir TODOs críticos en GitHub Issues
- [ ] Remover TODOs obsoletos

---

### 8. Fetch Directo en Frontend (Anti-Pattern)

**Problema:**
Según `.cursorrules`, se debe usar cliente API centralizado, pero hay fetch directo en:

```typescript
// apps/web/app/portfolios/[id]/page.tsx:96
const response = await fetch(`${apiUrl}/portfolios/templates/${templateId}/lines`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

**Otros archivos afectados:**
- `apps/web/app/admin/aum/page.tsx`
- `apps/web/app/admin/aum/history/page.tsx`
- `apps/web/app/admin/aum/[fileId]/page.tsx`
- `apps/web/app/admin/aum/components/FileUploader.tsx`
- `apps/web/app/admin/aum/components/ContactUserPicker.tsx`
- `apps/web/app/admin/aum/components/DuplicateResolutionModal.tsx`
- `apps/web/app/admin/aum/components/RowMatchForm.tsx`

**Impacto:**
- Sin retry automático
- Sin refresh token automático
- Sin error handling consistente
- Sin timeout configurable

**Recomendación:**
- [ ] Migrar a cliente API centralizado (`lib/api-client.ts`)
- [ ] Crear métodos en `lib/api/portfolios.ts` para templates
- [ ] Seguir patrón establecido en Epic-D

---

### 9. Código Comentado en Nav.tsx

**Ubicación:** `packages/ui/src/components/nav/Nav.tsx`

```typescript
// Líneas 82-85 (vacías al final del archivo)



```

**Problema:** 
- 4 líneas vacías al final del archivo
- No es código comentado, solo espacios

**Recomendación:**
- [ ] Limpiar líneas vacías (menor prioridad)
- [ ] Configurar prettier/eslint para trim trailing whitespace

---

### 10. Scripts con Nombres Hardcodeados

**Ubicación:** `apps/api/src/scripts/assign-unassigned-contacts.ts`

```typescript
// Línea 11
console.log('\n🔍 Buscando usuario "giolivo santarelli"...\n');
```

**Problema:**
- Script tiene nombre hardcodeado
- Debería recibir parámetro

**Checklist según `cleanup-administration-center.sh`:**
- [ ] Parametrizar script para aceptar nombre/email como argumento

**Recomendación:**
```typescript
// Mejorado:
const targetUser = process.argv[2] || 'giolivo santarelli';
console.log(`\n🔍 Buscando usuario "${targetUser}"...\n`);
```

---

## ✅ Bajo - Observaciones Menores

### 11. Archivos de Tests (Apropiado)

Se encontraron múltiples archivos `.test.ts` - **Esto es correcto** según la arquitectura:
- Unit tests: `[file].test.ts` junto al archivo original
- Coverage: Backend ≥70%, Frontend ≥60%
- Framework: Vitest (NO Jest)

No requiere acción.

---

### 12. Comentarios AI_DECISION (✅ Buena Práctica)

Se encontraron múltiples comentarios `AI_DECISION` documentando decisiones:

```typescript
// AI_DECISION: Timeout dinámico basado en cantidad de items
// Justificación: Evita timeouts en comparaciones grandes
// Impacto: Mejor UX y uso de recursos

// AI_DECISION: Eliminar Pool manual - usar solo Drizzle
// Justificación: Drizzle ya maneja conexiones con pool interno
// Impacto: Mejor gestión de conexiones
```

✅ **Excelente práctica** - Mantener y expandir.

---

### 13. Barrel Exports (✅ Buena Práctica)

```typescript
// apps/web/types/index.ts
/**
 * Barrel export para todos los tipos
 */

// apps/web/lib/api/index.ts
/**
 * Barrel export para todos los métodos de API
 */
```

✅ Sigue mejores prácticas de organización.

---

## 📋 Checklist de Acción Priorizada

### 🔴 Crítico (1-2 semanas)

- [ ] **Decidir sobre Tag Rules/Segments**: Completar o remover (3d)
- [ ] **Eliminar Pool manual en AUM** según AI_DECISION (1d)
- [ ] **Migrar console.log a logger** en código de runtime (2d)
- [ ] **Clarificar Portfolio Templates**: Legacy vs activo (1d)

### 🟡 Alto (1 mes)

- [ ] **Auditar y actualizar dependencias deprecadas** (3d)
- [ ] **Migrar fetch directo a API client** en admin/AUM (5d)
- [ ] **Remover código deprecado** (validation.ts aliases) (2d)
- [ ] **Priorizar TODOs críticos** y crear GitHub Issues (2d)

### 🟢 Bajo (Backlog)

- [ ] Parametrizar script assign-unassigned-contacts (1h)
- [ ] Limpiar líneas vacías en Nav.tsx (5min)
- [ ] Documentar relación CRM vs Epic-D (2h)

---

## 📈 Métricas de Calidad

### Estado Actual

| Categoría | Score | Notas |
|-----------|-------|-------|
| **Arquitectura** | 8/10 | Bien estructurado, algunos anti-patterns |
| **Testing** | 7/10 | Tests presentes, falta coverage completo |
| **Documentación** | 8.5/10 | Excelente con AI_DECISION comments |
| **Deuda Técnica** | 6/10 | 60+ TODOs, features incompletas |
| **Seguridad** | 9/10 | Validaciones, auth, CORS bien implementados |
| **Performance** | 8/10 | Batch queries, timeouts configurables |

### Score General: **7.5/10** ⭐

---

## 🎯 Recomendaciones Finales

1. **Priorizar feature flags**: Decidir sobre Tag Rules/Segments
2. **Limpiar deuda técnica**: Remover Pool manual y código deprecado
3. **Unificar logging**: Eliminar console.* en runtime
4. **Documentar dominios**: Clarificar CRM vs Epic-D
5. **Migrar a API client**: Eliminar fetch directo
6. **Actualizar deps**: Remover dependencias deprecadas

---

## 📚 Referencias

- `.cursorrules` - Reglas del proyecto
- `ARCHITECTURE.md` - Decisiones de arquitectura
- `TESTING_ARCHITECTURE.md` - Estrategia de testing
- `scripts/cleanup-administration-center.sh` - Checklist manual existente

---

**Siguiente paso sugerido:** Crear GitHub Issues para items críticos y planificar sprint de limpieza técnica.

