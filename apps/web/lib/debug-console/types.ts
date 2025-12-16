/**
 * Tipos para el sistema de Debug Console
 */

export interface ErrorLog {
  timestamp: string;
  type: 'error' | 'warn' | 'info' | 'log';
  message: string;
  stack?: string | undefined;
  source?: string | undefined;
  line?: number | undefined;
  col?: number | undefined;
  url?: string | undefined;
  userAgent?: string | undefined;
  details?: Record<string, unknown> | undefined;
  count?: number;
  collapsed?: boolean;
}

export interface DeduplicationKey {
  message: string;
  stack?: string;
  type: string;
}

export type FilterType = 'all' | 'error' | 'warn' | 'info' | 'log';
export type SortOrder = 'newest' | 'oldest' | 'type';

export interface FilterConfig {
  value: FilterType;
  label: string;
  emoji: string;
}

export const FILTER_TYPES: FilterConfig[] = [
  { value: 'all', label: 'Todos', emoji: '📋' },
  { value: 'error', label: 'Errores', emoji: '❌' },
  { value: 'warn', label: 'Warnings', emoji: '⚠️' },
  { value: 'info', label: 'Info', emoji: 'ℹ️' },
  { value: 'log', label: 'Logs', emoji: '📝' },
];

export const LOG_COLORS: Record<ErrorLog['type'], string> = {
  error: '#ef4444',
  warn: '#f59e0b',
  info: '#3b82f6',
  log: '#6b7280',
};
