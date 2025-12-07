/**
 * Utilidades para Debug Console
 */

import type { DeduplicationKey, ErrorLog, FilterType, SortOrder } from './types';

/**
 * Debounce function para limitar llamadas frecuentes
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Genera una clave única para deduplicación de logs
 */
export function getDeduplicationKey(log: Partial<ErrorLog>): string {
  const key: DeduplicationKey = {
    message: log.message || '',
    ...(log.stack ? { stack: log.stack } : {}),
    type: log.type || 'log',
  };
  return JSON.stringify(key);
}

/**
 * Filtra y ordena logs según criterios
 */
export function getFilteredAndSortedLogs(
  logs: ErrorLog[],
  filterType: FilterType,
  searchQuery: string,
  sortOrder: SortOrder
): ErrorLog[] {
  let filtered = logs;

  // Aplicar filtro por tipo
  if (filterType !== 'all') {
    filtered = filtered.filter((l) => l.type === filterType);
  }

  // Aplicar búsqueda
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.message.toLowerCase().includes(query) ||
        l.stack?.toLowerCase().includes(query) ||
        l.url?.toLowerCase().includes(query) ||
        l.source?.toLowerCase().includes(query)
    );
  }

  // Aplicar ordenamiento
  if (sortOrder === 'oldest') {
    filtered = [...filtered].reverse();
  } else if (sortOrder === 'type') {
    filtered = [...filtered].sort((a, b) => {
      const typeOrder = { error: 0, warn: 1, info: 2, log: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }

  return filtered;
}

/**
 * Escapa caracteres especiales para regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resalta texto con un query de búsqueda
 */
export function highlightText(text: string, query: string): string {
  if (!query) return '';
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark style="background: #fef08a; padding: 2px 0;">$1</mark>');
}

/**
 * Verifica si un mensaje es un error NEXT_REDIRECT (que debe ignorarse)
 */
export function isNextRedirectError(message: string): boolean {
  return message === 'NEXT_REDIRECT' || message.includes('NEXT_REDIRECT');
}



























