/**
 * Tests para common Zod schemas
 * 
 * AI_DECISION: Tests unitarios para schemas compartidos
 * Justificación: Validación consistente en toda la API
 * Impacto: Prevenir errores de validación y asegurar consistencia
 */

import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  emailSchema,
  urlSchema,
  isoDateSchema,
  dateSchema,
  timeSchema,
  paginationQuerySchema,
  sortQuerySchema,
  searchQuerySchema,
  dateRangeQuerySchema,
  idParamSchema,
  fileIdParamSchema,
  contactIdParamSchema,
  userIdParamSchema,
  rowIdParamSchema,
  userRoleSchema,
  brokerSchema,
  statusSchema,
  aumStatusSchema,
  matchStatusSchema,
  fileUploadSchema,
  uuidFromString,
  optionalUuidSchema,
  paginationSchemaWithLimit
} from './common-schemas';

describe('uuidSchema', () => {
  it('debería aceptar UUID válido', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(() => uuidSchema.parse(validUuid)).not.toThrow();
    expect(uuidSchema.parse(validUuid)).toBe(validUuid);
  });

  it('debería rechazar UUID inválido', () => {
    expect(() => uuidSchema.parse('invalid-uuid')).toThrow();
    expect(() => uuidSchema.parse('123')).toThrow();
    expect(() => uuidSchema.parse('')).toThrow();
  });

  it('debería rechazar UUID con formato incorrecto', () => {
    expect(() => uuidSchema.parse('550e8400-e29b-41d4-a716')).toThrow();
    expect(() => uuidSchema.parse('550e8400e29b41d4a716446655440000')).toThrow();
  });
});

describe('emailSchema', () => {
  it('debería aceptar email válido', () => {
    expect(() => emailSchema.parse('test@example.com')).not.toThrow();
    expect(() => emailSchema.parse('user.name+tag@example.co.uk')).not.toThrow();
  });

  it('debería rechazar email inválido', () => {
    expect(() => emailSchema.parse('invalid-email')).toThrow();
    expect(() => emailSchema.parse('@example.com')).toThrow();
    expect(() => emailSchema.parse('user@')).toThrow();
    expect(() => emailSchema.parse('user @example.com')).toThrow();
  });
});

describe('urlSchema', () => {
  it('debería aceptar URL válida', () => {
    expect(() => urlSchema.parse('https://example.com')).not.toThrow();
    expect(() => urlSchema.parse('http://example.com/path?query=1')).not.toThrow();
  });

  it('debería rechazar URL inválida', () => {
    expect(() => urlSchema.parse('not-a-url')).toThrow();
    expect(() => urlSchema.parse('example.com')).toThrow();
  });
});

describe('isoDateSchema', () => {
  it('debería aceptar ISO date válida', () => {
    expect(() => isoDateSchema.parse('2024-01-15T10:30:00Z')).not.toThrow();
    expect(() => isoDateSchema.parse('2024-01-15T10:30:00.123Z')).not.toThrow();
  });

  it('debería rechazar ISO date inválida', () => {
    expect(() => isoDateSchema.parse('2024-01-15')).toThrow();
    expect(() => isoDateSchema.parse('01/15/2024')).toThrow();
    expect(() => isoDateSchema.parse('2024-01-15T10:30')).toThrow();
  });
});

describe('dateSchema', () => {
  it('debería aceptar date válida (YYYY-MM-DD)', () => {
    expect(() => dateSchema.parse('2024-01-15')).not.toThrow();
    expect(() => dateSchema.parse('2024-12-31')).not.toThrow();
  });

  it('debería rechazar date inválida', () => {
    expect(() => dateSchema.parse('01/15/2024')).toThrow();
    expect(() => dateSchema.parse('2024-1-15')).toThrow();
    expect(() => dateSchema.parse('2024-01-15T10:30:00Z')).toThrow();
  });
});

describe('timeSchema', () => {
  it('debería aceptar time válido (HH:MM)', () => {
    expect(() => timeSchema.parse('10:30')).not.toThrow();
    expect(() => timeSchema.parse('23:59')).not.toThrow();
    expect(() => timeSchema.parse('00:00')).not.toThrow();
  });

  it('debería rechazar time inválido', () => {
    expect(() => timeSchema.parse('10:30:00')).toThrow();
    expect(() => timeSchema.parse('10')).toThrow();
    expect(() => timeSchema.parse('25:00')).toThrow();
  });
});

describe('paginationQuerySchema', () => {
  it('debería aceptar paginación válida', () => {
    expect(() => paginationQuerySchema.parse({ limit: '10', offset: '0' })).not.toThrow();
    expect(() => paginationQuerySchema.parse({ limit: '50', offset: '100' })).not.toThrow();
  });

  it('debería usar valores por defecto', () => {
    const result = paginationQuerySchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('debería validar límite máximo de 100', () => {
    expect(() => paginationQuerySchema.parse({ limit: '100', offset: '0' })).not.toThrow();
    expect(() => paginationQuerySchema.parse({ limit: '101', offset: '0' })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: '200', offset: '0' })).toThrow();
  });

  it('debería validar límite mínimo de 1', () => {
    expect(() => paginationQuerySchema.parse({ limit: '1', offset: '0' })).not.toThrow();
    expect(() => paginationQuerySchema.parse({ limit: '0', offset: '0' })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: '-1', offset: '0' })).toThrow();
  });

  it('debería validar offset mínimo de 0', () => {
    expect(() => paginationQuerySchema.parse({ limit: '10', offset: '0' })).not.toThrow();
    expect(() => paginationQuerySchema.parse({ limit: '10', offset: '-1' })).toThrow();
  });

  it('debería rechazar limit y offset no numéricos', () => {
    expect(() => paginationQuerySchema.parse({ limit: 'abc', offset: '0' })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: '10', offset: 'abc' })).toThrow();
  });

  it('debería rechazar page y offset juntos', () => {
    expect(() => paginationQuerySchema.parse({ page: '1', offset: '0' })).toThrow();
  });

  it('debería aceptar page solo', () => {
    expect(() => paginationQuerySchema.parse({ page: '1' })).not.toThrow();
  });
});

describe('sortQuerySchema', () => {
  it('debería aceptar sort válido', () => {
    expect(() => sortQuerySchema.parse({ sortBy: 'name', sortOrder: 'asc' })).not.toThrow();
    expect(() => sortQuerySchema.parse({ sortBy: 'createdAt', sortOrder: 'desc' })).not.toThrow();
  });

  it('debería usar sortOrder default desc', () => {
    const result = sortQuerySchema.parse({ sortBy: 'name' });
    expect(result.sortOrder).toBe('desc');
  });

  it('debería rechazar sortOrder inválido', () => {
    expect(() => sortQuerySchema.parse({ sortOrder: 'invalid' })).toThrow();
  });
});

describe('searchQuerySchema', () => {
  it('debería aceptar search válido', () => {
    expect(() => searchQuerySchema.parse({ q: 'test' })).not.toThrow();
    expect(() => searchQuerySchema.parse({ search: 'test' })).not.toThrow();
  });

  it('debería rechazar q y search juntos', () => {
    expect(() => searchQuerySchema.parse({ q: 'test', search: 'test' })).toThrow();
  });

  it('debería validar longitud máxima', () => {
    expect(() => searchQuerySchema.parse({ q: 'a'.repeat(255) })).not.toThrow();
    expect(() => searchQuerySchema.parse({ q: 'a'.repeat(256) })).toThrow();
  });
});

describe('dateRangeQuerySchema', () => {
  it('debería aceptar date range válido', () => {
    expect(() => dateRangeQuerySchema.parse({ fromDate: '2024-01-01', toDate: '2024-12-31' })).not.toThrow();
    expect(() => dateRangeQuerySchema.parse({ startDate: '2024-01-01T00:00:00Z', endDate: '2024-12-31T23:59:59Z' })).not.toThrow();
  });

  it('debería aceptar solo fromDate', () => {
    expect(() => dateRangeQuerySchema.parse({ fromDate: '2024-01-01' })).not.toThrow();
  });

  it('debería aceptar solo toDate', () => {
    expect(() => dateRangeQuerySchema.parse({ toDate: '2024-12-31' })).not.toThrow();
  });
});

describe('idParamSchema', () => {
  it('debería aceptar ID válido', () => {
    expect(() => idParamSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
  });

  it('debería rechazar ID inválido', () => {
    expect(() => idParamSchema.parse({ id: 'invalid' })).toThrow();
  });
});

describe('fileIdParamSchema', () => {
  it('debería aceptar fileId válido', () => {
    expect(() => fileIdParamSchema.parse({ fileId: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
  });
});

describe('contactIdParamSchema', () => {
  it('debería aceptar contactId válido', () => {
    expect(() => contactIdParamSchema.parse({ contactId: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
  });
});

describe('userIdParamSchema', () => {
  it('debería aceptar userId válido', () => {
    expect(() => userIdParamSchema.parse({ userId: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
  });
});

describe('rowIdParamSchema', () => {
  it('debería aceptar rowId válido', () => {
    expect(() => rowIdParamSchema.parse({ rowId: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
  });
});

describe('userRoleSchema', () => {
  it('debería aceptar roles válidos', () => {
    expect(() => userRoleSchema.parse('admin')).not.toThrow();
    expect(() => userRoleSchema.parse('manager')).not.toThrow();
    expect(() => userRoleSchema.parse('advisor')).not.toThrow();
  });

  it('debería rechazar rol inválido', () => {
    expect(() => userRoleSchema.parse('invalid')).toThrow();
    expect(() => userRoleSchema.parse('ADMIN')).toThrow();
  });
});

describe('brokerSchema', () => {
  it('debería aceptar brokers válidos', () => {
    expect(() => brokerSchema.parse('balanz')).not.toThrow();
    expect(() => brokerSchema.parse('other')).not.toThrow();
  });

  it('debería usar default balanz', () => {
    const result = brokerSchema.parse(undefined);
    expect(result).toBe('balanz');
  });
});

describe('statusSchema', () => {
  it('debería aceptar status válidos', () => {
    expect(() => statusSchema.parse('active')).not.toThrow();
    expect(() => statusSchema.parse('inactive')).not.toThrow();
    expect(() => statusSchema.parse('pending')).not.toThrow();
    expect(() => statusSchema.parse('completed')).not.toThrow();
    expect(() => statusSchema.parse('cancelled')).not.toThrow();
  });
});

describe('aumStatusSchema', () => {
  it('debería aceptar AUM status válidos', () => {
    expect(() => aumStatusSchema.parse('uploaded')).not.toThrow();
    expect(() => aumStatusSchema.parse('parsed')).not.toThrow();
    expect(() => aumStatusSchema.parse('committed')).not.toThrow();
    expect(() => aumStatusSchema.parse('failed')).not.toThrow();
  });
});

describe('matchStatusSchema', () => {
  it('debería aceptar match status válidos', () => {
    expect(() => matchStatusSchema.parse('matched')).not.toThrow();
    expect(() => matchStatusSchema.parse('unmatched')).not.toThrow();
    expect(() => matchStatusSchema.parse('ambiguous')).not.toThrow();
  });
});

describe('fileUploadSchema', () => {
  it('debería aceptar file upload válido', () => {
    expect(() => fileUploadSchema.parse({
      originalFilename: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 1024
    })).not.toThrow();
  });

  it('debería validar tamaño máximo de 25MB', () => {
    expect(() => fileUploadSchema.parse({
      originalFilename: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 25 * 1024 * 1024
    })).not.toThrow();

    expect(() => fileUploadSchema.parse({
      originalFilename: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 25 * 1024 * 1024 + 1
    })).toThrow();
  });

  it('debería validar mime types permitidos', () => {
    expect(() => fileUploadSchema.parse({
      originalFilename: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 1024
    })).not.toThrow();

    expect(() => fileUploadSchema.parse({
      originalFilename: 'test.xls',
      mimeType: 'application/vnd.ms-excel',
      sizeBytes: 1024
    })).not.toThrow();

    expect(() => fileUploadSchema.parse({
      originalFilename: 'test.csv',
      mimeType: 'text/csv',
      sizeBytes: 1024
    })).not.toThrow();

    expect(() => fileUploadSchema.parse({
      originalFilename: 'test.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024
    })).toThrow();
  });
});

describe('uuidFromString', () => {
  it('debería crear schema UUID con nombre de campo custom', () => {
    const schema = uuidFromString('contactId');
    expect(() => schema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    expect(() => schema.parse('invalid')).toThrow(/contactId must be a valid UUID/);
  });
});

describe('optionalUuidSchema', () => {
  it('debería aceptar UUID válido', () => {
    const schema = optionalUuidSchema('id');
    expect(() => schema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
  });

  it('debería aceptar undefined', () => {
    const schema = optionalUuidSchema('id');
    expect(() => schema.parse(undefined)).not.toThrow();
  });

  it('debería aceptar null', () => {
    const schema = optionalUuidSchema('id');
    expect(() => schema.parse(null)).not.toThrow();
  });
});

describe('paginationSchemaWithLimit', () => {
  it('debería crear schema con límite custom', () => {
    const schema = paginationSchemaWithLimit(200);
    expect(() => schema.parse({ limit: '200', offset: '0' })).not.toThrow();
    expect(() => schema.parse({ limit: '201', offset: '0' })).toThrow();
  });

  it('debería usar límite por defecto si no se especifica', () => {
    const schema = paginationSchemaWithLimit();
    expect(() => schema.parse({ limit: '500', offset: '0' })).not.toThrow();
    expect(() => schema.parse({ limit: '501', offset: '0' })).toThrow();
  });
});










