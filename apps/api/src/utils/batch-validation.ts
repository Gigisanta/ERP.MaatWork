/**
 * Utilidad para validación de endpoints batch
 * 
 * AI_DECISION: Crear validaciones centralizadas para endpoints batch
 * Justificación: Evitar DoS, validar formato, mejorar seguridad
 * Impacto: Código más seguro y mantenible
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BATCH_LIMITS = {
  MAX_PORTFOLIOS: 100,
  MAX_BENCHMARKS: 100,
  MAX_INSTRUMENTS: 200,
  MAX_IDS_GENERAL: 100,
} as const;

export interface BatchValidationResult {
  valid: boolean;
  ids: string[];
  errors?: string[];
}

/**
 * Validar lista de IDs para endpoints batch
 */
export function validateBatchIds(
  idsParam: string | undefined,
  options: {
    maxCount?: number;
    requireUuid?: boolean;
    fieldName?: string;
  } = {}
): BatchValidationResult {
  const { 
    maxCount = BATCH_LIMITS.MAX_IDS_GENERAL, 
    requireUuid = true,
    fieldName = 'ids'
  } = options;

  const errors: string[] = [];

  // Verificar que se proporcionó el parámetro
  if (!idsParam) {
    return {
      valid: false,
      ids: [],
      errors: [`Missing required parameter: ${fieldName}`]
    };
  }

  // Split y limpiar
  const rawIds = idsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);

  if (rawIds.length === 0) {
    return {
      valid: false,
      ids: [],
      errors: ['Empty ID list provided']
    };
  }

  // Verificar límite
  if (rawIds.length > maxCount) {
    return {
      valid: false,
      ids: [],
      errors: [`Too many IDs. Maximum ${maxCount} allowed, got ${rawIds.length}`]
    };
  }

  // Validar formato UUID si se requiere
  const validIds: string[] = [];
  const invalidIds: string[] = [];

  if (requireUuid) {
    for (const id of rawIds) {
      if (UUID_REGEX.test(id)) {
        validIds.push(id);
      } else {
        invalidIds.push(id);
      }
    }

    if (invalidIds.length > 0) {
      errors.push(`Invalid UUID format for IDs: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? '...' : ''}`);
    }
  } else {
    validIds.push(...rawIds);
  }

  // Eliminar duplicados
  const uniqueIds = Array.from(new Set(validIds));
  const duplicateCount = validIds.length - uniqueIds.length;
  
  if (duplicateCount > 0) {
    // Esto es warning, no error
    errors.push(`Warning: ${duplicateCount} duplicate ID(s) removed`);
  }

  return {
    valid: uniqueIds.length > 0 && invalidIds.length === 0,
    ids: uniqueIds,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Sanitizar y validar parámetros de query comunes
 */
export function sanitizeQueryParam(
  param: unknown,
  options: {
    defaultValue?: string;
    allowedValues?: string[];
    maxLength?: number;
  } = {}
): string | undefined {
  const { defaultValue, allowedValues, maxLength = 100 } = options;

  // Si no hay valor, retornar default
  if (param === undefined || param === null || param === '') {
    return defaultValue;
  }

  // Convertir a string y limpiar
  let value = String(param).trim();

  // Verificar longitud
  if (value.length > maxLength) {
    value = value.substring(0, maxLength);
  }

  // Verificar valores permitidos
  if (allowedValues && !allowedValues.includes(value)) {
    return defaultValue;
  }

  return value;
}

/**
 * Validar período de tiempo
 */
export function validatePeriod(period: unknown): {
  valid: boolean;
  period: string;
  error?: string;
} {
  const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
  const defaultPeriod = '1Y';

  if (!period) {
    return { valid: true, period: defaultPeriod };
  }

  const periodStr = String(period).toUpperCase().trim();

  if (!validPeriods.includes(periodStr)) {
    return {
      valid: false,
      period: defaultPeriod,
      error: `Invalid period. Valid periods: ${validPeriods.join(', ')}`
    };
  }

  return { valid: true, period: periodStr };
}

/**
 * Validar límite de paginación
 */
export function validateLimit(limit: unknown, options: {
  min?: number;
  max?: number;
  defaultValue?: number;
} = {}): number {
  const { min = 1, max = 100, defaultValue = 20 } = options;

  // Si es undefined o null, retornar default
  if (limit === undefined || limit === null) {
    return defaultValue;
  }

  const limitNum = parseInt(String(limit), 10);

  if (isNaN(limitNum) || limitNum < min) {
    return min;
  }

  if (limitNum > max) {
    return max;
  }

  return limitNum;
}

/**
 * Validar offset de paginación
 */
export function validateOffset(offset: unknown): number {
  if (!offset) {
    return 0;
  }

  const offsetNum = parseInt(String(offset), 10);

  if (isNaN(offsetNum) || offsetNum < 0) {
    return 0;
  }

  return offsetNum;
}

