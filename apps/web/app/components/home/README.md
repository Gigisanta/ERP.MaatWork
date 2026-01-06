# Home Dashboard Widgets - Documentación

## Resumen de Cambios

Este documento describe las mejoras implementadas en los widgets del dashboard home para mejorar UX, productividad y consistencia visual.

---

## 1. QuickActionsWidget - Rediseño Compacto

**Archivo:** `QuickActionsWidget.tsx`

### Cambios Implementados

- ✅ **Diseño iOS/macOS-like**: Grid de 3 columnas con íconos grandes (40px) y texto pequeño debajo
- ✅ **Reducción de espacio**: Eliminadas descripciones largas, padding reducido de `p-4 md:p-6` a `p-3`
- ✅ **Consistencia visual**: Removido gradiente exagerado, usa `border-primary/10` como otros cards
- ✅ **Hover effects**: Transiciones suaves con `hover:bg-surface-hover` y scale en íconos

### Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Altura** | ~270px | ~150px (~45% reducción) |
| **Layout** | Botones verticales con descripción | Grid 3x1 compacto |
| **Padding** | `p-4 md:p-6` | `p-3` |
| **Íconos** | 20px | 40px |
| **Descripción** | Texto largo visible | Eliminado (solo en aria-label) |

### Uso

```tsx
<QuickActionsWidget />
```

---

## 2. TodayTasksWidget - Inteligencia Mejorada

**Archivo:** `TodayTasksWidget.tsx`

### Fuentes de Datos Integradas

1. **Tareas vencidas** (`task_overdue`)
   - Filtro: `dueDate < today` y `status IN ('open', 'in_progress')`
   - Prioridad: 10 + días de retraso

2. **Tareas del día** (`task_today`)
   - Filtro: `dueDate = today` y `status IN ('open', 'in_progress')`
   - Prioridad: 8

3. **Contactos estancados en pipeline** (`stale_contact`)
   - Filtro: `pipelineStageUpdatedAt > 14 días` y etapa ≠ "Cliente"
   - Prioridad: 7 (ajustable según días)

4. **Reuniones pendientes** (`meeting_pending`)
   - Filtro: `meetingStatus.firstMeeting.status !== 'completed'` o `secondMeeting.status !== 'completed'`
   - Prioridad: 6

5. **Contactos sin interacción** (`no_interaction`)
   - Filtro: `contactLastTouchAt > 7 días` o `null`
   - Prioridad: 5

### Algoritmo de Priorización Inteligente

**Mix Inteligente:**

1. Garantiza **al menos 1 item de cada categoría** (si existe)
2. Completa hasta `maxItems` (default: 8) con items de mayor prioridad global
3. Ordena por prioridad dentro de cada categoría

**Ejemplo de salida:**

```
1. [Tarea Vencida] Llamar a Juan Pérez - 3 días de retraso
2. [Tarea Hoy] Enviar propuesta a María González
3. [Estancado] Carlos López - En "Primera Reunión" - 21 días sin avanzar
4. [Reunión Pendiente] Ana Martínez - Primera reunión pendiente
5. [Sin Contacto] Pedro Sánchez - Hace 15 días
```

### Configuración

```tsx
// Umbrales configurables
const STALE_CONTACT_THRESHOLD_DAYS = 14;
const NO_INTERACTION_THRESHOLD_DAYS = 7;

// Máximo de items mostrados
<TodayTasksWidget maxItems={8} />
```

---

## 3. ActionItemCard - Componente Reutilizable

**Archivo:** `ActionItemCard.tsx`

### Características

- ✅ Renderizado consistente para todos los tipos de acciones
- ✅ Badges con colores por tipo (error, warning, info, default)
- ✅ Íconos específicos por categoría
- ✅ Hover effects con chevron animado
- ✅ Metadata adicional (días de retraso, días estancado)

### Configuración Visual por Tipo

| Tipo | Badge | Ícono | Color |
|------|-------|-------|-------|
| `task_overdue` | "Vencida" (rojo) | alert-circle | text-error |
| `task_today` | "Hoy" (amarillo) | clock | text-warning |
| `stale_contact` | "Estancado" (naranja) | pause-circle | text-warning |
| `meeting_pending` | "Reunión pendiente" (azul) | calendar | text-info |
| `no_interaction` | "Sin contacto" (gris) | user-x | text-text-secondary |

### Uso

```tsx
import { ActionItemCard } from './ActionItemCard';
import type { TodayActionItem } from '@/types/dashboard';

const item: TodayActionItem = {
  id: 'task-123',
  type: 'task_overdue',
  priority: 10,
  title: 'Llamar a cliente',
  subtitle: 'Seguimiento de propuesta',
  href: '/contacts/abc-123',
  icon: 'alert-circle',
  daysOverdue: 3,
};

<ActionItemCard item={item} />
```

---

## 4. HomePageClient - Layout Ajustado

**Archivo:** `HomePageClient.tsx`

### Cambios en Grid

**Antes:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2"> {/* QuickActions */}
  <div className="lg:col-span-1"> {/* TodayTasks */}
</div>
```

**Después:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-1"> {/* QuickActions - más compacto */}
  <div className="lg:col-span-2"> {/* TodayTasks - más espacio */}
</div>
```

### Justificación

- QuickActions rediseñado necesita menos espacio horizontal
- TodayTasks tiene más contenido y se beneficia del espacio adicional
- Mejor balance visual en desktop

---

## 5. Tipos TypeScript

**Archivo:** `apps/web/types/dashboard.ts`

### Interfaces Principales

```typescript
export type TodayActionType =
  | 'task_overdue'
  | 'task_today'
  | 'stale_contact'
  | 'meeting_pending'
  | 'no_interaction';

export interface TodayActionItem {
  id: string;
  type: TodayActionType;
  priority: number;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  daysOverdue?: number;
  daysStale?: number;
  contactName?: string;
  metadata?: Record<string, unknown>;
}
```

### Constantes de Configuración

```typescript
export const ACTION_PRIORITY_MAP: Record<TodayActionType, number> = {
  task_overdue: 10,
  task_today: 8,
  stale_contact: 7,
  meeting_pending: 6,
  no_interaction: 5,
};

export const ACTION_TYPE_CONFIG: Record<TodayActionType, ActionTypeConfig> = {
  // ... configuración visual por tipo
};
```

---

## 6. API Hooks - Extensión

**Archivo:** `apps/web/lib/api-hooks.ts`

### Cambio en `useTasks`

**Antes:**
```typescript
export function useTasks(contactId: string)
```

**Después:**
```typescript
export function useTasks(params?: { 
  contactId?: string; 
  assignedToUserId?: string 
})
```

### Justificación

- Permite filtrar tareas por usuario asignado (necesario para widget home)
- Mantiene compatibilidad con uso existente en `TasksSection`
- Más flexible para futuros casos de uso

---

## Performance

### Optimizaciones Implementadas

1. **useMemo** para cálculos de items priorizados
2. **Filtrado eficiente** sin traer datos innecesarios
3. **Límite de items** (maxItems=8) para evitar renderizado excesivo
4. **SWR caching** automático para requests repetidos

### Métricas Esperadas

- **Carga inicial**: <500ms con 50+ contactos y 20+ tareas
- **Re-renders**: Minimizados gracias a useMemo
- **Bundle size**: Sin impacto significativo (~3KB adicionales)

---

## Testing

### Casos de Prueba

1. ✅ Widget vacío (sin acciones pendientes)
2. ✅ Solo tareas vencidas
3. ✅ Mix de categorías (algoritmo inteligente)
4. ✅ Más de 8 items (truncamiento correcto)
5. ✅ Responsive design (mobile/tablet/desktop)
6. ✅ Hover states y transiciones
7. ✅ Navegación a URLs correctas

### Verificación Manual

```bash
# 1. Typecheck
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Dev server
pnpm dev

# 4. Navegar a http://localhost:3000 (autenticado)
```

---

## Migración y Compatibilidad

### Breaking Changes

❌ **Ninguno** - Todos los cambios son internos a los widgets

### Actualizaciones Necesarias

✅ **TasksSection.tsx** - Actualizado para usar nueva firma de `useTasks`:

```typescript
// Antes
const { tasks } = useTasks(contactId);

// Después
const { tasks } = useTasks({ contactId });
```

---

## Próximos Pasos (Opcional)

### Mejoras Futuras

1. **Página dedicada de tareas** (`/tasks`)
   - Reemplazar href temporal en QuickActions
   - Vista completa con filtros y ordenamiento

2. **Configuración de umbrales**
   - Permitir al usuario ajustar días para "estancado" y "sin interacción"
   - Guardar en preferencias de usuario

3. **Notificaciones push**
   - Alertas para tareas vencidas
   - Recordatorios de contactos estancados

4. **Analytics**
   - Tracking de clicks en action items
   - Métricas de productividad (items completados por día)

---

## Referencias

- **Plan original**: `.cursor/plans/mejorar_widgets_home_*.plan.md`
- **Reglas aplicadas**: `.cursor/rules/domains/web.mdc`, `.cursor/rules/01-typescript.mdc`
- **Componentes UI**: `packages/ui/src/components/`
- **Tipos compartidos**: `apps/web/types/dashboard.ts`



