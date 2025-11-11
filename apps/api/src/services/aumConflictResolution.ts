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
 * Prioriza la fila más reciente con advisorRaw no vacío.
 */
export function inheritAdvisorFromExisting(
  incomingAdvisorRaw: string | null | undefined,
  existingRows: ExistingAumAccountSnapshot[]
): string | null {
  const cleanedIncoming = cleanValue(incomingAdvisorRaw);
  if (cleanedIncoming) {
    return cleanedIncoming;
  }

  const sortedByCreatedAt = [...existingRows].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  for (const row of sortedByCreatedAt) {
    const candidate = cleanValue(row.advisorRaw);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

/**
 * Detecta conflicto contra filas existentes. Ignora diferencias de asesor
 * cuando el upload actual no trae columna de asesor.
 */
export function shouldFlagConflict(
  existingRows: ExistingAumAccountSnapshot[],
  incomingHolderName: string | null,
  incomingAdvisorRaw: string | null | undefined
): boolean {
  const normalizedHolder = normalizeForComparison(incomingHolderName);
  const normalizedAdvisor = normalizeForComparison(incomingAdvisorRaw);

  const holderConflict = normalizedHolder !== null && existingRows.some((row) => {
    const existingHolder = normalizeForComparison(row.holderName);
    return existingHolder !== null && existingHolder !== normalizedHolder;
  });

  const advisorConflict = normalizedAdvisor !== null && existingRows.some((row) => {
    const existingAdvisor = normalizeForComparison(row.advisorRaw);
    return existingAdvisor !== null && existingAdvisor !== normalizedAdvisor;
  });

  return holderConflict || advisorConflict;
}


