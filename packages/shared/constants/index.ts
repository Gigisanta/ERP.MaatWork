// Shared constants

export const CONTACT_STATUSES = [
  'Prospecto',
  'Cliente',
  'Inactivo',
  'En Negociación',
] as const;

export const TASK_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
} as const;

export const CACHE_TTLS = {
  metrics: 60_000, // 1 min
  contacts: 30_000, // 30 s
  deals: 30_000,
  tasks: 30_000,
} as const;

