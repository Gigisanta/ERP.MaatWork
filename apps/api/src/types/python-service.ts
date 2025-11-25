/**
 * Tipos para respuestas del servicio Python de analytics
 * 
 * AI_DECISION: Tipos específicos para respuestas del servicio Python
 * Justificación: Eliminar uso de `any` y proporcionar type safety completo
 * Impacto: Mejor type safety y detección de errores en tiempo de compilación
 */

/**
 * Códigos externos de un instrumento (ej: exchange, bloomberg, etc.)
 */
export interface ExternalCodes {
  exchange?: string;
  [key: string]: string | undefined;
}

/**
 * Resultado individual de búsqueda de símbolos
 */
export interface SymbolSearchResult {
  symbol: string;
  name: string;
  shortName?: string;
  currency: string;
  exchange: string;
  type: string; // 'EQUITY' | 'BOND' | 'ETF' | etc.
  sector?: string | null;
  industry?: string | null;
}

/**
 * Respuesta de búsqueda de símbolos del servicio Python
 * Puede tener dos formatos:
 * 1. { status: 'success', data: { results: SymbolSearchResult[] } }
 * 2. { status: 'success', data: SymbolSearchResult[] }
 * 3. { status: 'error', message: string }
 */
export interface SymbolSearchResponse {
  status: 'success' | 'error';
  data?: {
    results?: SymbolSearchResult[];
  } | SymbolSearchResult[] | {
    message?: string;
  };
  message?: string;
}

/**
 * Respuesta de validación de símbolo
 */
export interface SymbolValidationResponse {
  valid: boolean;
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  type?: string;
  error?: string;
}

/**
 * Respuesta de información de símbolo del servicio Python
 */
export interface SymbolInfoResponse {
  success?: boolean;
  name?: string;
  currency?: string;
  market?: string;
  sector?: string | null;
  industry?: string | null;
  error?: string;
}

/**
 * Respuesta de precios históricos
 */
export interface PriceRecord {
  date: string;
  close_price: number;
}

/**
 * Respuesta de backfill de precios
 */
export interface PriceBackfillResponse {
  success: boolean;
  data?: Record<string, PriceRecord[]>;
  error?: string;
}

/**
 * Error de conexión con el servicio Python
 * Extiende Error pero agrega propiedades específicas de Node.js
 */
export interface PythonServiceConnectionError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  address?: string;
  port?: number;
}

/**
 * Type guard para verificar si un error es de conexión
 */
export function isConnectionError(error: unknown): error is PythonServiceConnectionError {
  if (!(error instanceof Error)) {
    return false;
  }
  
  const err = error as PythonServiceConnectionError;
  const message = typeof err.message === 'string' ? err.message : '';
  return (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.name === 'AbortError' ||
    (message !== '' && (
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('timeout') ||
      message.includes('fetch failed')
    ))
  );
}

