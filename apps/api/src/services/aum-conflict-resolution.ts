/**
 * AUM Conflict Resolution Helpers
 *
 * AI_DECISION: Extraer lógica de herencia de asesor y detección de conflictos
 * Justificación: Evitar duplicación en rutas y permitir tests unitarios claros
 * Impacto: Reglas explícitas para uploads mensuales sin columna de asesor
 */

export interface ExistingAumAccountSnapshot {
  holderName: string | null;
  advisorRaw: string | null;
  matchedUserId: string | null;
  isNormalized: boolean;
  createdAt: Date | string;
}

/**
 * Normaliza strings para comparaciones simples (lowercase, quita acentos y espacios extra)
 */
function normalizeForComparison(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Devuelve el string limpio (trim) preservando capitalización
 */
function cleanValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Hereda el advisorRaw de imports previos cuando el CSV actual no lo trae.
 * Prioriza filas normalizadas y luego la más reciente con advisorRaw no vacío.
 *
 * @param incomingAdvisorRaw - Nombre del asesor en el CSV actual (puede ser null/undefined)
 * @param existingRows - Filas existentes para buscar herencia
 * @returns Nombre del asesor heredado o null si no se encuentra
 *
 * AI_DECISION: Priorizar filas normalizadas para preservar asignaciones manuales
 * Justificación: Las filas normalizadas fueron completadas manualmente y deben preservarse
 * Impacto: Las asignaciones manuales de asesores se mantienen en futuras importaciones
 */
export function inheritAdvisorFromExisting(
  incomingAdvisorRaw: string | null | undefined,
  existingRows: ExistingAumAccountSnapshot[]
): string | null {
  const cleanedIncoming = cleanValue(incomingAdvisorRaw);
  if (cleanedIncoming) {
    return cleanedIncoming;
  }

  if (existingRows.length === 0) {
    return null;
  }

  // Priorizar filas normalizadas (completadas manualmente)
  const normalizedRows = existingRows.filter((row) => row.isNormalized);
  const nonNormalizedRows = existingRows.filter((row) => !row.isNormalized);

  // Función para ordenar por fecha (más reciente primero)
  const sortByCreatedAt = (a: ExistingAumAccountSnapshot, b: ExistingAumAccountSnapshot) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  };

  // Buscar primero en filas normalizadas
  const sortedNormalized = [...normalizedRows].sort(sortByCreatedAt);
  for (const row of sortedNormalized) {
    const candidate = cleanValue(row.advisorRaw);
    if (candidate) {
      return candidate;
    }
  }

  // Si no hay en normalizadas, buscar en las demás (más reciente primero)
  const sortedNonNormalized = [...nonNormalizedRows].sort(sortByCreatedAt);
  for (const row of sortedNonNormalized) {
    const candidate = cleanValue(row.advisorRaw);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

/**
 * Hereda el matchedUserId de imports previos cuando el CSV actual no trae asesor.
 * Prioriza filas normalizadas y luego la más reciente con matchedUserId.
 *
 * @param existingRows - Filas existentes para buscar herencia
 * @returns ID del usuario asesor heredado o null si no se encuentra
 *
 * AI_DECISION: Priorizar filas normalizadas para preservar asignaciones manuales
 * Justificación: Las filas normalizadas fueron completadas manualmente y deben preservarse
 * Impacto: Las asignaciones manuales de asesores se mantienen en futuras importaciones
 */
export function inheritMatchedUserIdFromExisting(
  existingRows: ExistingAumAccountSnapshot[]
): string | null {
  if (existingRows.length === 0) {
    return null;
  }

  // Función helper para ordenar por fecha (más reciente primero)
  const sortByCreatedAt = (a: ExistingAumAccountSnapshot, b: ExistingAumAccountSnapshot) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  };

  // Priorizar filas normalizadas (completadas manualmente)
  const normalizedRows = existingRows.filter(
    (row) => row.isNormalized && row.matchedUserId !== null && row.matchedUserId !== undefined
  );

  if (normalizedRows.length > 0) {
    const sorted = [...normalizedRows].sort(sortByCreatedAt);
    return sorted[0].matchedUserId;
  }

  // Si no hay en normalizadas, buscar en las demás (más reciente primero)
  const nonNormalizedRows = existingRows.filter(
    (row) => row.matchedUserId !== null && row.matchedUserId !== undefined
  );

  if (nonNormalizedRows.length > 0) {
    const sorted = [...nonNormalizedRows].sort(sortByCreatedAt);
    return sorted[0].matchedUserId;
  }

  return null;
}

/**
 * Detecta conflicto contra filas existentes. Ignora diferencias de asesor
 * cuando el upload actual no trae columna de asesor.
 *
 * @param existingRows - Filas existentes para comparar
 * @param incomingHolderName - Nombre del titular de la fila entrante
 * @param incomingAdvisorRaw - Nombre del asesor de la fila entrante (puede ser null/undefined)
 * @returns true si hay conflicto detectado, false en caso contrario
 *
 * AI_DECISION: Detección de conflictos separada por tipo (holder vs advisor)
 * Justificación: Permite identificar conflictos específicos y manejar cada caso apropiadamente
 * Impacto: Mejor detección de problemas de integridad de datos
 */
export function shouldFlagConflict(
  existingRows: ExistingAumAccountSnapshot[],
  incomingHolderName: string | null,
  incomingAdvisorRaw: string | null | undefined
): boolean {
  // Early return si no hay filas existentes
  if (existingRows.length === 0) {
    return false;
  }

  const normalizedHolder = normalizeForComparison(incomingHolderName);
  const normalizedAdvisor = normalizeForComparison(incomingAdvisorRaw);

  // Detectar conflicto en nombre del titular
  // Un conflicto ocurre si hay filas existentes con diferentes nombres de titular
  const holderConflict =
    normalizedHolder !== null &&
    existingRows.some((row) => {
      const existingHolder = normalizeForComparison(row.holderName);
      return existingHolder !== null && existingHolder !== normalizedHolder;
    });

  // Detectar conflicto en asesor (solo si el upload actual trae asesor)
  // Si no trae asesor, ignoramos diferencias de asesor (se heredará de filas existentes)
  const advisorConflict =
    normalizedAdvisor !== null &&
    existingRows.some((row) => {
      const existingAdvisor = normalizeForComparison(row.advisorRaw);
      return existingAdvisor !== null && existingAdvisor !== normalizedAdvisor;
    });

  return holderConflict || advisorConflict;
}
