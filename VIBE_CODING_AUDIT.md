# 🔍 Auditoría de "Vibe Coding" - Violaciones de .cursorrules

**Fecha:** 2025-11-01  
**Objetivo:** Identificar código que no sigue los patrones establecidos en `.cursorrules`

---

## ❌ Problemas Críticos Encontrados

### 1. `export * from` en Barrel Export (Tree-shaking)

**Ubicación:** `apps/web/lib/api/index.ts`

**Problema:**
```typescript
// ❌ MAL - Barrel export genérico
export * from './portfolios';
export * from './benchmarks';
export * from './instruments';
// ... 12 más
```

**Regla violada:** `.cursorrules` especifica "Exports específicos (NO `export *`) para tree-shaking"

**Impacto:** Next.js no puede tree-shake componentes no usados del cliente API

**Solución sugerida:**
```typescript
// ✅ BIEN - Exports específicos
export { getPortfolios, createPortfolio, updatePortfolio, deletePortfolio } from './portfolios';
export { getBenchmarks, createBenchmark } from './benchmarks';
// ...
```

---

### 2. `fetch` Directo Sin Cliente Centralizado

**Ubicaciones encontradas:**

#### a) `apps/web/app/contacts/[id]/page.tsx` (Líneas 46-51)
```typescript
// ❌ MAL - fetch directo en Server Component
const contactResponse = await fetch(`${apiUrl}/v1/contacts/${id}`, {
  headers: { 'Authorization': `Bearer ${token}` },
  cache: 'no-store'
});
```

**Regla violada:** `.cursorrules` dice "NUNCA usar `fetch` directamente - Usar cliente centralizado"

**Solución:** Usar `apiClient` o método de `lib/api/contacts.ts`

---

#### b) `apps/web/lib/api/aum.ts` (Línea 58)
```typescript
// ⚠️ Parcialmente justificado - FormData necesita fetch directo
const response = await fetch(`${API_BASE_URL}/v1/admin/aum/uploads?broker=${broker}`, {
  method: 'POST',
  headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
  body: formData,
});
```

**Justificación:** Comentario indica que FormData requiere fetch directo porque `apiClient` usa JSON.stringify

**Mejora sugerida:** Agregar método `apiClient.postFormData()` para manejar FormData

---

#### c) `apps/web/lib/api-hooks.ts` (Línea 11)
```typescript
// ⚠️ Aceptable - fetcher de SWR necesita fetch directo para deduplicación
const fetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  // ...
};
```

**Justificación:** SWR necesita control directo del fetch para deduplicación

**Mejora sugerida:** Mover lógica de auth/retry a wrapper que use `apiClient` internamente

---

#### d) `apps/web/lib/logger.ts` (Línea 72)
```typescript
// ⚠️ Aceptable - logging de errores de cliente
await fetch(`${apiUrl}/logs/client`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(logData)
});
```

**Justificación:** Logger no debe depender de cliente API (evitar ciclos)

**Mejora sugerida:** Usar fetch con timeout y manejo de errores silencioso

---

### 3. `window.location` en Next.js

**Ubicaciones encontradas:**

#### a) `apps/web/app/login/page.tsx` (Líneas 36, 62)
```typescript
// ❌ MAL - window.location en Next.js
const searchParams = new URLSearchParams(window.location.search);
```

**Regla violada:** `.cursorrules` dice "❌ `window.location` en Next.js (usar `useRouter`)"

**Solución:**
```typescript
// ✅ BIEN - Usar Next.js router
import { useSearchParams } from 'next/navigation';
const searchParams = useSearchParams();
```

---

#### b) `apps/web/components/ErrorBoundary.tsx` (Líneas 45, 143, 170)
```typescript
// ❌ MAL - window.location.href para redirección
onClick={() => window.location.href = '/'}
url: typeof window !== 'undefined' ? window.location.href : undefined
```

**Solución:** Usar `useRouter().push('/')` o `redirect()` en Server Components

---

#### c) `apps/web/lib/logger.ts` (Línea 62)
```typescript
// ⚠️ Aceptable - Solo lectura para logging de URL
url: typeof window !== 'undefined' ? window.location.href : undefined
```

**Justificación:** Solo lectura para contexto de error

**Mejora:** Usar `usePathname()` y `useSearchParams()` de Next.js si es posible

---

#### d) `apps/web/app/auth/AuthContext.tsx` (Línea 126)
```typescript
// ⚠️ Aceptable - Solo lectura para detectar HTTPS
const secureAttr = typeof window !== 'undefined' && window.location.protocol === 'https:' ? ' Secure' : '';
```

**Justificación:** Solo lectura para detectar protocolo

---

### 4. `alert()` / `confirm()` Nativos

**Ubicaciones encontradas:**

#### a) `apps/web/components/ErrorBoundary.tsx` (Línea 72)
```typescript
// ❌ MAL - alert() nativo
alert('Error reportado. Gracias por tu feedback.');
```

**Regla violada:** `.cursorrules` dice "❌ `alert()` / `confirm()` nativos (usar Toast/Modal)"

**Solución:** Usar `<Toast>` de `@cactus/ui`

---

#### b) `apps/web/app/profile/page.tsx` (Líneas 150, 179, 208, 219)
```typescript
// ❌ MAL - alert() y confirm() nativos
alert('Contraseña cambiada exitosamente');
alert('Equipo creado exitosamente');
alert('Invitación enviada exitosamente');
const confirm = window.confirm('¿Seguro que deseas abandonar este equipo?');
```

**Solución:** 
- Reemplazar `alert()` con `<Toast>` para mensajes de éxito
- Reemplazar `confirm()` con `<Modal>` para confirmaciones

---

#### c) Múltiples archivos con `confirm()` para eliminaciones
- `apps/web/app/portfolios/[id]/page.tsx` (Línea 177)
- `apps/web/app/contacts/page.tsx` (Línea 178)
- `apps/web/app/contacts/[id]/TasksSection.tsx` (Línea 81)
- `apps/web/app/contacts/[id]/PortfolioSection.tsx` (Línea 78)
- `apps/web/app/contacts/[id]/NotesSection.tsx` (Línea 78)
- `apps/web/app/contacts/[id]/BrokerAccountsSection.tsx` (Línea 80)
- `apps/web/app/portfolios/page.tsx` (Líneas 489, 588)

**Solución:** Crear componente `<ConfirmDialog>` reutilizable que use `<Modal>` de `@cactus/ui`

---

### 5. Tipos `any` Sin Justificación

**Ubicaciones encontradas:**

#### a) `apps/web/lib/api-error.ts` (Línea 126)
```typescript
// ❌ MAL - any sin justificación
let errorData: any;
```

**Problema:** Tipo `any` sin justificación explícita

**Solución:** Definir tipo específico o usar `unknown` y validar con Zod

---

#### b) `apps/web/lib/logger.ts` (Múltiples líneas)
```typescript
// ⚠️ Parcialmente justificado - Record<string, any> para context flexible
context?: Record<string, any>
```

**Justificación:** Logger necesita aceptar cualquier estructura de datos para logging flexible

**Mejora sugerida:** Usar `Record<string, unknown>` y validar estructura si es necesario

---

#### c) `apps/web/types/contact.ts` (Línea 24)
```typescript
// ⚠️ Parcialmente justificado - customFields necesita ser flexible
customFields?: Record<string, any>;
```

**Justificación:** Custom fields pueden tener cualquier estructura

**Mejora sugerida:** Definir tipo union o usar Zod para validación

---

#### d) `apps/web/types/aum.ts` (Línea 56)
```typescript
// ⚠️ Parcialmente justificado - raw data del parseo
raw?: Record<string, any>; // Datos raw del parseo
```

**Justificación:** Datos raw del Excel pueden tener cualquier estructura

**Mejora sugerida:** Mantener comentario explicativo o definir tipo más específico si es posible

---

### 6. Console.log en Producción

**Ubicaciones encontradas:**

#### a) `apps/api/src/scripts/assign-unassigned-contacts.ts` (Múltiples líneas)
```typescript
// ⚠️ Aceptable - Script CLI puede usar console.log
console.log('\n💡 Tip: Puedes especificar un usuario como argumento:');
console.log('   pnpm -F @cactus/api run assign-unassigned-contacts "Nombre Usuario"\n');
```

**Justificación:** Scripts CLI necesitan output directo a consola

---

#### b) `apps/api/src/config/timeouts.ts` (Línea 130)
```typescript
// ⚠️ Parcialmente justificado - Comentario explica razón
// Usar console.warn directamente para evitar ciclos de importación
console.warn('⚠️  Timeout configuration warnings:', validation.warnings);
```

**Justificación:** Comentario indica evitar ciclos de importación

**Mejora sugerida:** Usar logger lazy o inyectar logger como dependencia

---

## 📊 Resumen de Violaciones

| Categoría | Críticos | Parcialmente Justificados | Aceptables |
|-----------|---------|--------------------------|------------|
| `export * from` | 1 | 0 | 0 |
| `fetch` directo | 1 | 3 | 0 |
| `window.location` | 2 | 2 | 0 |
| `alert/confirm` | 10+ | 0 | 0 |
| Tipos `any` | 1 | 3 | 0 |
| `console.log` | 0 | 1 | 1 |
| **Total** | **15+** | **9** | **1** |

---

## 🎯 Recomendaciones Prioritarias

### 🔴 Alta Prioridad (Rompe patrones establecidos)

1. **Reemplazar `export * from` en `apps/web/lib/api/index.ts`**
   - Impacto: Tree-shaking en Next.js
   - Esfuerzo: Medio (definir exports específicos)
   - Beneficio: Bundle size reducido

2. **Eliminar `fetch` directo en `apps/web/app/contacts/[id]/page.tsx`**
   - Impacto: Consistencia, retry, timeout automático
   - Esfuerzo: Bajo (usar método de `lib/api/contacts.ts`)
   - Beneficio: Mejor manejo de errores

3. **Reemplazar `window.location` en `apps/web/app/login/page.tsx`**
   - Impacto: Compatibilidad con SSR, mejor UX
   - Esfuerzo: Bajo (usar `useSearchParams()`)
   - Beneficio: Mejor rendimiento y SEO

4. **Crear componente `<ConfirmDialog>` reutilizable**
   - Impacto: Consistencia UI, mejor UX
   - Esfuerzo: Medio (componente nuevo usando `<Modal>`)
   - Beneficio: Reemplazar 10+ usos de `confirm()`

### 🟡 Media Prioridad (Mejoras de calidad)

5. **Agregar método `apiClient.postFormData()` para FormData**
   - Impacto: Consistencia en cliente API
   - Esfuerzo: Bajo
   - Beneficio: Eliminar fetch directo en `aum.ts`

6. **Reemplazar tipos `any` por `unknown` o tipos específicos**
   - Impacto: Type safety
   - Esfuerzo: Variable (según caso)
   - Beneficio: Menos errores en runtime

7. **Reemplazar `alert()` con `<Toast>` en ErrorBoundary y profile**
   - Impacto: Mejor UX
   - Esfuerzo: Bajo
   - Beneficio: Consistencia con design system

---

## ✅ Buenas Prácticas Encontradas

1. ✅ **Validación Zod:** Todos los endpoints usan `validate()` middleware
2. ✅ **Logging estructurado:** Uso consistente de `req.log` en API
3. ✅ **RBAC:** Middleware `requireAuth` y `requireRole` en todos los endpoints
4. ✅ **Exports específicos en @cactus/ui:** `packages/ui/src/index.ts` usa exports específicos
5. ✅ **No shadowing:** No se encontraron funciones que hagan shadowing de imports
6. ✅ **No magic numbers:** Uso de constantes configuradas (timeouts, etc.)

---

## 📝 Próximos Pasos

1. Crear issues de GitHub para cada categoría de problema
2. Priorizar según impacto y esfuerzo
3. Implementar mejoras de alta prioridad en siguiente sprint
4. Agregar reglas de ESLint para prevenir algunos problemas (ej: `no-restricted-globals` para `alert/confirm`)
5. Agregar checks en pre-commit para detectar `export * from` en ciertos archivos

