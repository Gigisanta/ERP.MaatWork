/**
 * Dashboard Types
 *
 * Tipos compartidos para widgets y componentes del dashboard home
 */

/**
 * Tipo de acción en el widget "Qué hacer hoy"
 */
export type TodayActionType =
  | 'task_overdue' // Tarea vencida
  | 'task_today' // Tarea programada para hoy
  | 'stale_contact' // Contacto estancado en pipeline
  | 'meeting_pending' // Reunión pendiente (1ra o 2da)
  | 'no_interaction'; // Contacto sin interacción reciente

/**
 * Item accionable para el widget "Qué hacer hoy"
 *
 * AI_DECISION: Estructura unificada para diferentes tipos de acciones
 * Justificación: Permite renderizado consistente y algoritmo de priorización común
 * Impacto: Código más mantenible, fácil agregar nuevos tipos de acciones
 */
export interface TodayActionItem {
  /** ID único del item (taskId, contactId, etc) */
  id: string;

  /** Tipo de acción */
  type: TodayActionType;

  /** Prioridad numérica (1-10, donde 10 es más urgente) */
  priority: number;

  /** Título principal del item */
  title: string;

  /** Subtítulo/descripción adicional */
  subtitle: string;

  /** URL de navegación al hacer click */
  href: string;

  /** Nombre del ícono (lucide-react) */
  icon: string;

  /** Días de retraso (para tareas vencidas) */
  daysOverdue?: number;

  /** Días sin cambio (para contactos estancados) */
  daysStale?: number;

  /** Nombre del contacto (cuando aplica) */
  contactName?: string;

  /** Metadata adicional específica por tipo */
  metadata?: Record<string, unknown>;
}

/**
 * Configuración de prioridades por tipo
 */
export const ACTION_PRIORITY_MAP: Record<TodayActionType, number> = {
  task_overdue: 10, // Máxima prioridad
  task_today: 8,
  stale_contact: 7, // Ajustable según días
  meeting_pending: 6,
  no_interaction: 5,
};

/**
 * Configuración visual por tipo de acción
 */
export interface ActionTypeConfig {
  badgeLabel: string;
  badgeVariant: 'error' | 'warning' | 'info' | 'default';
  icon: string;
  color: string;
}

export const ACTION_TYPE_CONFIG: Record<TodayActionType, ActionTypeConfig> = {
  task_overdue: {
    badgeLabel: 'Vencida',
    badgeVariant: 'error',
    icon: 'alert-circle',
    color: 'text-error',
  },
  task_today: {
    badgeLabel: 'Hoy',
    badgeVariant: 'warning',
    icon: 'clock',
    color: 'text-warning',
  },
  stale_contact: {
    badgeLabel: 'Estancado',
    badgeVariant: 'warning',
    icon: 'pause-circle',
    color: 'text-warning',
  },
  meeting_pending: {
    badgeLabel: 'Reunión pendiente',
    badgeVariant: 'info',
    icon: 'calendar',
    color: 'text-info',
  },
  no_interaction: {
    badgeLabel: 'Sin contacto',
    badgeVariant: 'default',
    icon: 'user-x',
    color: 'text-text-secondary',
  },
};
