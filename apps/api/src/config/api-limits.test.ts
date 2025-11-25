/**
 * Tests para api-limits config
 * 
 * AI_DECISION: Tests unitarios para validación de límites
 * Justificación: Validación crítica de límites de API
 * Impacto: Prevenir errores en validación de límites
 */

import { describe, it, expect } from 'vitest';
import {
  PAGINATION_LIMITS,
  RATE_LIMITS,
  API_TIMEOUTS,
  PAYLOAD_LIMITS,
  VALIDATION_LIMITS,
  RETRY_LIMITS,
  ERROR_LIMITS,
  validatePageSize,
  calculateOffset
} from './api-limits';

describe('PAGINATION_LIMITS', () => {
  it('debería tener límites correctos', () => {
    expect(PAGINATION_LIMITS.MIN_PAGE_SIZE).toBe(1);
    expect(PAGINATION_LIMITS.DEFAULT_PAGE_SIZE).toBe(50);
    expect(PAGINATION_LIMITS.MAX_PAGE_SIZE).toBe(500);
    expect(PAGINATION_LIMITS.QUICK_SEARCH_LIMIT).toBe(20);
    expect(PAGINATION_LIMITS.EXPORT_LIMIT).toBe(10000);
  });
});

describe('RATE_LIMITS', () => {
  it('debería tener límites de rate correctos', () => {
    expect(RATE_LIMITS.PUBLIC_REQUESTS_PER_MINUTE).toBe(60);
    expect(RATE_LIMITS.AUTHENTICATED_REQUESTS_PER_MINUTE).toBe(300);
    expect(RATE_LIMITS.HEAVY_OPERATIONS_PER_MINUTE).toBe(10);
    expect(RATE_LIMITS.WINDOW_MS).toBe(60000);
  });
});

describe('API_TIMEOUTS', () => {
  it('debería tener timeouts correctos', () => {
    expect(API_TIMEOUTS.SIMPLE_OPERATION).toBe(10000);
    expect(API_TIMEOUTS.SEARCH_OPERATION).toBe(15000);
    expect(API_TIMEOUTS.WRITE_OPERATION).toBe(20000);
    expect(API_TIMEOUTS.HEAVY_OPERATION).toBe(60000);
    expect(API_TIMEOUTS.EXPORT_OPERATION).toBe(300000);
  });
});

describe('PAYLOAD_LIMITS', () => {
  it('debería tener límites de payload correctos', () => {
    expect(PAYLOAD_LIMITS.MAX_BODY_SIZE).toBe(10 * 1024 * 1024);
    expect(PAYLOAD_LIMITS.MAX_QUERY_STRING_LENGTH).toBe(2048);
    expect(PAYLOAD_LIMITS.MAX_ARRAY_ITEMS).toBe(1000);
    expect(PAYLOAD_LIMITS.MAX_STRING_LENGTH).toBe(10000);
  });
});

describe('VALIDATION_LIMITS', () => {
  it('debería tener límites de validación correctos', () => {
    expect(VALIDATION_LIMITS.MIN_NAME_LENGTH).toBe(1);
    expect(VALIDATION_LIMITS.MAX_NAME_LENGTH).toBe(200);
    expect(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH).toBe(2000);
    expect(VALIDATION_LIMITS.MAX_EMAIL_LENGTH).toBe(255);
    expect(VALIDATION_LIMITS.MAX_URL_LENGTH).toBe(500);
    expect(VALIDATION_LIMITS.MAX_PHONE_LENGTH).toBe(50);
    expect(VALIDATION_LIMITS.MAX_DNI_LENGTH).toBe(50);
  });
});

describe('RETRY_LIMITS', () => {
  it('debería tener límites de retry correctos', () => {
    expect(RETRY_LIMITS.MAX_RETRIES).toBe(3);
    expect(RETRY_LIMITS.INITIAL_RETRY_DELAY).toBe(1000);
    expect(RETRY_LIMITS.RETRY_BACKOFF_FACTOR).toBe(2);
    expect(RETRY_LIMITS.MAX_RETRY_DELAY).toBe(10000);
  });
});

describe('ERROR_LIMITS', () => {
  it('debería tener límites de error correctos', () => {
    expect(ERROR_LIMITS.MAX_ERRORS_IN_RESPONSE).toBe(3);
    expect(ERROR_LIMITS.MAX_CONSECUTIVE_ERRORS).toBe(3);
  });
});

describe('validatePageSize', () => {
  it('debería retornar tamaño mínimo cuando es menor', () => {
    expect(validatePageSize(0)).toBe(PAGINATION_LIMITS.MIN_PAGE_SIZE);
    expect(validatePageSize(-1)).toBe(PAGINATION_LIMITS.MIN_PAGE_SIZE);
  });

  it('debería retornar tamaño máximo cuando es mayor', () => {
    expect(validatePageSize(1000)).toBe(PAGINATION_LIMITS.MAX_PAGE_SIZE);
    expect(validatePageSize(5000)).toBe(PAGINATION_LIMITS.MAX_PAGE_SIZE);
  });

  it('debería retornar tamaño original cuando está en rango válido', () => {
    expect(validatePageSize(10)).toBe(10);
    expect(validatePageSize(50)).toBe(50);
    expect(validatePageSize(100)).toBe(100);
  });
});

describe('calculateOffset', () => {
  it('debería calcular offset correctamente', () => {
    expect(calculateOffset(1, 10)).toBe(0);
    expect(calculateOffset(2, 10)).toBe(10);
    expect(calculateOffset(3, 10)).toBe(20);
  });

  it('debería usar página mínima de 1', () => {
    expect(calculateOffset(0, 10)).toBe(0);
    expect(calculateOffset(-1, 10)).toBe(0);
  });

  it('debería validar pageSize antes de calcular', () => {
    expect(calculateOffset(1, 0)).toBe(0);
    expect(calculateOffset(1, 1000)).toBe(0);
  });
});

