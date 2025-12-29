/**
 * Gestión de almacenamiento para Debug Console
 */

import type { ErrorLog } from './types';

const STORAGE_KEY = 'debug-console-logs';

/**
 * Carga logs guardados desde localStorage
 */
export function loadLogs(): ErrorLog[] {
  if (typeof window === 'undefined') return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('No se pudieron cargar logs guardados', e);
  }
  return [];
}

/**
 * Guarda logs en localStorage
 */
export function saveLogs(logs: ErrorLog[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Guardar solo los datos esenciales, sin estados de UI
    const logsToSave = logs.map(({ collapsed, ...log }) => log);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logsToSave));
  } catch (e) {
    console.warn('No se pudieron guardar logs', e);
  }
}

/**
 * Limpia logs de localStorage
 */
export function clearStoredLogs(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('No se pudieron limpiar logs', e);
  }
}








