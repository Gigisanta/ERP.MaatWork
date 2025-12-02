/**
 * Cliente API centralizado
 * 
 * Re-exports from modular structure in ./api/ for backward compatibility.
 * 
 * AI_DECISION: Refactorizado a estructura modular en ./api/
 * Justificación: Clase de 385 líneas dividida en módulos especializados
 * Impacto: Mejor mantenibilidad, funciones más testeables, código más navegable
 * 
 * Estructura modular:
 * - ./api/types.ts - Tipos compartidos (RequestOptions, RequestConfig)
 * - ./api/request-builder.ts - Construcción de headers y serialización de body
 * - ./api/retry-handler.ts - Lógica de retry con backoff exponencial
 * - ./api/auth-manager.ts - Gestión de refresh token
 * - ./api/client.ts - Clase principal ApiClient
 * - ./api/index.ts - Barrel export
 */

// Re-export everything from the modular structure
export { apiClient, ApiClient, ApiError } from './api';
export type { ApiResponse, RequestOptions, RequestConfig } from './api';
