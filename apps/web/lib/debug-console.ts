/**
 * Debug Console - Re-exportación para compatibilidad
 *
 * @deprecated Importar directamente desde './debug-console/index' para mejor tree-shaking
 *
 * AI_DECISION: Archivo refactorizado de 1069 líneas a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado, ahora dividido en:
 *   - types.ts: Tipos e interfaces
 *   - utils.ts: Funciones utilitarias
 *   - storage.ts: Gestión de localStorage
 *   - error-handlers.ts: Captura de errores
 *   - ui/styles.ts: Estilos CSS
 *   - ui/panel-builder.ts: Construcción del DOM
 *   - debug-console.ts: Clase principal
 *   - index.ts: Punto de entrada
 */

export { DebugConsole, initDebugConsole } from './debug-console/index';
export type { ErrorLog, FilterType, SortOrder } from './debug-console/types';
