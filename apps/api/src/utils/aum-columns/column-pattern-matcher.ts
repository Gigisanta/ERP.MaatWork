/**
 * Matching de patrones de columnas
 *
 * Funciones para buscar columnas por patrones y definiciones de patrones
 */

import { normalizeColumnName } from './normalize-column-name';

/**
 * Busca una columna por múltiples patrones
 * Prioriza coincidencias exactas sobre parciales
 *
 * @param availableColumns - Array de nombres de columnas disponibles (normalizados)
 * @param patterns - Array de patrones a buscar (normalizados)
 * @returns Nombre de columna original encontrado o null
 */
export function findColumnByPatterns(
  availableColumns: string[],
  patterns: string[]
): string | null {
  // Crear mapa de columnas normalizadas a originales
  const normalizedMap = new Map<string, string>();
  const normalizedColumns: string[] = [];

  for (const col of availableColumns) {
    const normalized = normalizeColumnName(col);
    normalizedColumns.push(normalized);
    // Mantener el primer nombre original que se normaliza a este
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, col);
    }
  }

  // Buscar coincidencias exactas primero
  for (const pattern of patterns) {
    const normalizedPattern = normalizeColumnName(pattern);
    if (normalizedColumns.includes(normalizedPattern)) {
      const original = normalizedMap.get(normalizedPattern);
      if (original) return original;
    }
  }

  // Buscar coincidencias parciales (la columna contiene el patrón o viceversa)
  // Solo si el patrón tiene al menos 3 caracteres para evitar falsos positivos
  // AI_DECISION: Coincidencias parciales más estrictas para evitar falsos positivos
  // Justificación: Evitar que "cuenta" coincida con "ejecutivo de cuenta" por coincidencia parcial
  // Impacto: Mapeo más preciso, especialmente para columnas como "cuenta" que pueden aparecer en múltiples contextos
  for (const pattern of patterns) {
    const normalizedPattern = normalizeColumnName(pattern);
    // Solo buscar coincidencias parciales si el patrón es suficientemente largo
    if (normalizedPattern.length < 3) continue;

    // Si el patrón tiene múltiples palabras, solo hacer coincidencias parciales si el patrón completo está contenido
    // Esto evita que "cuenta" coincida con "ejecutivo de cuenta" solo porque comparten una palabra
    const patternHasMultipleWords = normalizedPattern.includes(' ');

    for (const normalizedCol of normalizedColumns) {
      // Solo coincidencias parciales si ambos tienen al menos 3 caracteres
      if (normalizedCol.length < 3) continue;

      let shouldMatch = false;

      if (patternHasMultipleWords) {
        // Para patrones con múltiples palabras, solo coincidir si el patrón completo está contenido en la columna
        // O si la columna completa está contenida en el patrón (pero solo si la columna es suficientemente larga)
        shouldMatch =
          normalizedCol.includes(normalizedPattern) ||
          (normalizedCol.length >= 5 && normalizedPattern.includes(normalizedCol));
      } else {
        // Para patrones de una sola palabra, coincidir si está contenido (más permisivo)
        shouldMatch =
          normalizedCol.includes(normalizedPattern) || normalizedPattern.includes(normalizedCol);
      }

      if (shouldMatch) {
        const original = normalizedMap.get(normalizedCol);
        if (original) return original;
      }
    }
  }

  return null;
}

/**
 * Patrones de búsqueda para cada tipo de campo AUM
 * Los patrones más comunes y simples van primero para prioridad
 */
export const ACCOUNT_NUMBER_PATTERNS = [
  'comitente', // Comitente es el número de cuenta en este formato
  'cuenta comitente',
  'numero comitente',
  'nro comitente',
  'cuenta', // También puede ser número de cuenta en algunos formatos
  'numero cuenta',
  'numero de cuenta',
  'numero_cuenta',
  'nro cuenta',
  'nro de cuenta',
  'n cuenta',
  'account',
  'account number',
  'numero',
  'nro',
  'n°',
];

export const HOLDER_NAME_PATTERNS = [
  'cuenta', // En algunos formatos, "cuenta" es el nombre del titular
  'titular', // Patrón más simple y común
  'nombre titular',
  'nombre del titular',
  'descripcion',
  'descripción',
  'cliente',
  'nombre cliente',
  'nombre del cliente',
  'holder',
  'holder name',
  'nombre',
  'nombre completo',
  'razon social',
];

export const ID_CUENTA_PATTERNS = [
  'id cuenta',
  'id_cuenta',
  'idcuenta',
  'id de cuenta',
  'id de la cuenta',
  'cuenta id',
  'cuenta_id',
  'account id',
  'account_id',
];

export const ADVISOR_RAW_PATTERNS = [
  'asesor', // Patrón más simple y común primero
  'asesor asignado',
  'asesor_asignado',
  'advisor',
  'advisor name',
  'agente',
  'ejecutivo',
  'ejecutivo de cuenta',
  'representante',
];

export const AUM_DOLLARS_PATTERNS = [
  'aum en dolares',
  'aum dolares',
  'aum dollars',
  'aum usd',
  'aum en usd',
  'aum en dollars',
];

export const BOLSA_ARG_PATTERNS = ['bolsa arg', 'bolsa argentina', 'bolsa ar'];

export const FONDOS_ARG_PATTERNS = ['fondos arg', 'fondos argentina', 'fondos ar'];

export const BOLSA_BCI_PATTERNS = ['bolsa bci', 'bci'];

export const PESOS_PATTERNS = ['pesos', 'ars', 'pesos argentinos'];

export const MEP_PATTERNS = ['mep'];

export const CABLE_PATTERNS = ['cable'];

export const CV7000_PATTERNS = ['cv7000', 'cv 7000'];








