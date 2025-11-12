# Estrategia de Caching

## Fecha: Diciembre 2024

Este documento evalúa la estrategia de caching para datos que cambian poco y propone implementaciones.

---

## Datos Candidatos para Caching

### 1. Pipeline Stages

**Ubicación**: `apps/api/src/routes/pipeline/stages.ts`

**Características**:
- ✅ Cambian poco (solo cuando admin modifica etapas)
- ✅ Se consultan frecuentemente (en cada carga de pipeline board)
- ✅ Datos relativamente pequeños (< 1KB típicamente)

**Estrategia Propuesta**:
- **Cache en memoria** con TTL de 30 minutos
- **Invalidación** al crear/actualizar/eliminar etapas
- **Clave**: `pipeline:stages:${userId}` (si hay filtros por usuario) o `pipeline:stages:all`

**Implementación**:
```typescript
// apps/api/src/utils/cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 1800 }); // 30 minutos

export const pipelineStagesCache = {
  get: (key: string) => cache.get(key),
  set: (key: string, value: unknown) => cache.set(key, value),
  delete: (key: string) => cache.del(key),
  clear: () => cache.flushAll()
};
```

**Invalidación**:
- En `POST /pipeline/stages` - limpiar cache
- En `PUT /pipeline/stages/:id` - limpiar cache
- En `DELETE /pipeline/stages/:id` - limpiar cache

---

### 2. Instrumentos (Búsqueda)

**Ubicación**: `apps/api/src/routes/instruments.ts`

**Características**:
- ✅ Datos relativamente estables (instrumentos financieros no cambian frecuentemente)
- ✅ Búsquedas frecuentes (cada vez que usuario busca símbolo)
- ⚠️ Resultados pueden variar según query

**Estrategia Propuesta**:
- **Cache en memoria** con TTL de 1 hora
- **Clave**: `instruments:search:${normalizedQuery}`
- **Invalidación** al crear/actualizar instrumento

**Consideraciones**:
- Cachear solo queries comunes (más de 2 caracteres)
- Limitar tamaño de cache (max 1000 entradas)
- Usar LRU eviction

---

### 3. Benchmarks

**Ubicación**: `apps/api/src/routes/benchmarks.ts`

**Características**:
- ✅ Cambian poco (solo cuando admin modifica benchmarks)
- ✅ Se consultan frecuentemente (en comparaciones y analytics)
- ✅ Datos relativamente pequeños

**Estrategia Propuesta**:
- **Cache en memoria** con TTL de 1 hora
- **Invalidación** al crear/actualizar/eliminar benchmark

---

## Implementación Recomendada

### Fase 1: Pipeline Stages (Prioridad Alta)
- Impacto: Alto (se consulta en cada carga de board)
- Complejidad: Baja
- ROI: Alto

### Fase 2: Instrumentos (Prioridad Media)
- Impacto: Medio (reduce carga en servicio Python)
- Complejidad: Media (necesita normalización de queries)
- ROI: Medio

### Fase 3: Benchmarks (Prioridad Baja)
- Impacto: Bajo (menos consultas frecuentes)
- Complejidad: Baja
- ROI: Bajo

---

## Herramientas Recomendadas

1. **node-cache** (simple, en memoria)
   - ✅ Adecuado para desarrollo y pequeña escala
   - ✅ Sin dependencias externas
   - ❌ No compartido entre instancias

2. **Redis** (producción, multi-instancia)
   - ✅ Compartido entre instancias
   - ✅ Persistencia opcional
   - ❌ Requiere infraestructura adicional

**Recomendación**: Empezar con `node-cache` y migrar a Redis cuando sea necesario.

---

## Métricas de Éxito

- Reducción de queries a BD: >50% para pipeline stages
- Tiempo de respuesta: <10ms para datos cacheados
- Hit rate: >80% para queries frecuentes

---

## Próximos Pasos

1. Implementar cache para pipeline stages
2. Medir impacto y ajustar TTL
3. Implementar cache para instrumentos si es necesario
4. Considerar Redis para producción multi-instancia


