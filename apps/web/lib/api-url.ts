/**
 * Utilidad para construir URLs absolutas de la API
 *
 * AI_DECISION: Centralizar construcción de URLs absolutas usando config
 * Justificación: Evitar duplicación de `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`
 * Impacto: Usado en <a href> y <form action> donde se requieren URLs absolutas
 */

import { config } from './config';

export const API_BASE_URL = config.apiUrl;

/**
 * Construye una URL absoluta de la API
 * @param path - Path relativo (debe comenzar con /)
 * @returns URL absoluta
 */
export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
