# Auditoría de Queries N+1

## Fecha: Diciembre 2024

Este documento identifica y documenta posibles problemas N+1 en el código.

---

## Queries N+1 Identificadas

### ✅ Optimizado: Contacts con Tags

**Ubicación**: `apps/api/src/routes/contacts/crud.ts` (líneas 272-300)

**Estado**: ✅ **YA OPTIMIZADO**

**Implementación Actual**:
```typescript
// Batch query para obtener todas las tags de todos los contactos
const contactTagsList = await db()
  .select({...})
  .from(contactTags)
  .innerJoin(tags, eq(contactTags.tagId, tags.id))
  .where(inArray(contactTags.contactId, contactIds)) // ✅ Usa inArray para batch
```

**Análisis**: 
- ✅ Usa `inArray` para batch query
- ✅ Un solo query para todos los contactos
- ✅ Agrupa resultados en memoria

---

### ⚠️ Potencial N+1: Portfolio Assignments

**Ubicación**: `apps/api/src/routes/portfolio.ts` (línea 590+)

**Análisis**:
- Verificar acceso a contacto: Query individual por contacto
- Verificar template: Query individual por template
- **Riesgo**: Bajo (solo 2 queries por request, no en loop)

**Recomendación**: ✅ Mantener como está (no es N+1 real)

---

### ⚠️ Potencial N+1: Tasks con Contact Access Check

**Ubicación**: `apps/api/src/routes/tasks.ts` (línea 122)

**Análisis**:
```typescript
if (contactId) {
  const hasContactAccess = await canAccessContact(userId, userRole, contactId as string);
  // ...
}
```

**Riesgo**: Bajo - Solo se ejecuta si hay `contactId` en query, no en loop

**Recomendación**: ✅ Mantener como está

---

## Queries Optimizadas Identificadas

### ✅ Contacts List con Tags
- **Ubicación**: `apps/api/src/routes/contacts/crud.ts`
- **Optimización**: Batch query con `inArray`
- **Estado**: ✅ Optimizado

### ✅ Pipeline Board
- **Ubicación**: `apps/api/src/routes/pipeline/board.ts`
- **Optimización**: Usa joins y batch queries
- **Estado**: ✅ Optimizado

---

## Recomendaciones

### 1. Monitoreo Continuo
- Agregar logging de queries en desarrollo
- Identificar queries lentas (>100ms)
- Revisar queries ejecutadas en loops

### 2. Herramientas de Análisis
- Usar `drizzle-logger` para identificar queries repetitivas
- Revisar logs de BD para patrones N+1
- Considerar herramientas de profiling de queries

### 3. Best Practices
- ✅ Siempre usar `inArray` para queries en batch
- ✅ Usar joins cuando sea posible
- ✅ Cachear datos que cambian poco
- ✅ Evitar queries dentro de `.map()` o loops

---

## Conclusión

**Estado General**: ✅ **BUENO**

La mayoría de las queries están optimizadas. No se identificaron problemas N+1 críticos. Las optimizaciones existentes (batch queries con `inArray`, joins) están siendo utilizadas correctamente.

**Acciones Recomendadas**:
1. Continuar monitoreando queries en desarrollo
2. Implementar cache para datos frecuentes (ver CACHING_STRATEGY.md)
3. Revisar periódicamente nuevas features para evitar N+1


