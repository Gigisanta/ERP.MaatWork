/**
 * Tests para aum-validation schemas
 * 
 * AI_DECISION: Tests unitarios para validación de schemas Zod de AUM
 * Justificación: Validación crítica de respuestas de API, prevenir errores en runtime
 * Impacto: Mayor robustez y mejor debugging de errores de validación
 */

import { describe, it, expect } from 'vitest';
import {
  aumMatchStatusSchema,
  aumTotalsSchema,
  aumFileSchema,
  aumContactInfoSchema,
  aumUserInfoSchema,
  aumRowSchema,
  aumUploadResponseSchema,
  aumRowsResponseSchema,
  aumHistoryResponseSchema,
  aumMatchRowResponseSchema,
  type AumUploadResponse,
  type AumRowsResponse,
  type AumHistoryResponse,
  type AumMatchRowResponse
} from './aum-validation';

describe('aumMatchStatusSchema', () => {
  it('debería aceptar valores válidos', () => {
    expect(aumMatchStatusSchema.parse('matched')).toBe('matched');
    expect(aumMatchStatusSchema.parse('ambiguous')).toBe('ambiguous');
    expect(aumMatchStatusSchema.parse('unmatched')).toBe('unmatched');
  });

  it('debería rechazar valores inválidos', () => {
    expect(() => aumMatchStatusSchema.parse('invalid')).toThrow();
    expect(() => aumMatchStatusSchema.parse('')).toThrow();
    expect(() => aumMatchStatusSchema.parse(null)).toThrow();
  });
});

describe('aumTotalsSchema', () => {
  const validTotals = {
    parsed: 100,
    matched: 80,
    ambiguous: 10,
    conflicts: 5,
    unmatched: 5
  };

  it('debería aceptar objeto válido completo', () => {
    expect(aumTotalsSchema.parse(validTotals)).toEqual(validTotals);
  });

  it('debería aceptar con campos opcionales', () => {
    const withOptionals = {
      ...validTotals,
      inserts: 10,
      updates: 5
    };
    expect(aumTotalsSchema.parse(withOptionals)).toEqual(withOptionals);
  });

  it('debería rechazar valores faltantes requeridos', () => {
    expect(() => aumTotalsSchema.parse({})).toThrow();
    expect(() => aumTotalsSchema.parse({ parsed: 100 })).toThrow();
  });

  it('debería rechazar tipos incorrectos', () => {
    expect(() => aumTotalsSchema.parse({ ...validTotals, parsed: '100' })).toThrow();
    expect(() => aumTotalsSchema.parse({ ...validTotals, matched: null })).toThrow();
  });
});

describe('aumFileSchema', () => {
  const validFile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    broker: 'test-broker',
    originalFilename: 'test.csv',
    mimeType: 'text/csv',
    sizeBytes: 1024,
    uploadedByUserId: '123e4567-e89b-12d3-a456-426614174001',
    status: 'processed',
    createdAt: '2024-01-01T00:00:00Z'
  };

  it('debería aceptar archivo válido completo', () => {
    expect(aumFileSchema.parse(validFile)).toEqual(validFile);
  });

  it('debería aceptar con campos opcionales', () => {
    const withOptionals = {
      ...validFile,
      totalParsed: 100,
      totalMatched: 80,
      totalUnmatched: 20,
      totals: {
        parsed: 100,
        matched: 80,
        ambiguous: 10,
        conflicts: 5,
        unmatched: 5
      }
    };
    expect(aumFileSchema.parse(withOptionals)).toEqual(withOptionals);
  });

  it('debería rechazar UUID inválido', () => {
    expect(() => aumFileSchema.parse({ ...validFile, id: 'invalid-uuid' })).toThrow();
    expect(() => aumFileSchema.parse({ ...validFile, uploadedByUserId: 'not-uuid' })).toThrow();
  });

  it('debería rechazar campos requeridos faltantes', () => {
    expect(() => aumFileSchema.parse({})).toThrow();
    expect(() => aumFileSchema.parse({ id: validFile.id })).toThrow();
  });
});

describe('aumContactInfoSchema', () => {
  const validContact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe'
  };

  it('debería aceptar contacto válido', () => {
    expect(aumContactInfoSchema.parse(validContact)).toEqual(validContact);
  });

  it('debería aceptar null', () => {
    expect(aumContactInfoSchema.parse(null)).toBeNull();
  });

  it('debería rechazar objeto inválido', () => {
    expect(() => aumContactInfoSchema.parse({})).toThrow();
    expect(() => aumContactInfoSchema.parse({ id: 'invalid' })).toThrow();
  });
});

describe('aumUserInfoSchema', () => {
  const validUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com'
  };

  it('debería aceptar usuario válido', () => {
    expect(aumUserInfoSchema.parse(validUser)).toEqual(validUser);
  });

  it('debería aceptar null', () => {
    expect(aumUserInfoSchema.parse(null)).toBeNull();
  });

  it('debería rechazar email inválido', () => {
    expect(() => aumUserInfoSchema.parse({ ...validUser, email: 'invalid-email' })).toThrow();
    expect(() => aumUserInfoSchema.parse({ ...validUser, email: '' })).toThrow();
  });
});

describe('aumRowSchema', () => {
  const validRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fileId: '123e4567-e89b-12d3-a456-426614174001',
    accountNumber: '123456',
    holderName: 'John Doe',
    advisorRaw: 'Advisor Name',
    advisorNormalized: 'advisor-name',
    matchedContactId: '123e4567-e89b-12d3-a456-426614174002',
    matchedUserId: '123e4567-e89b-12d3-a456-426614174003',
    matchStatus: 'matched' as const,
    isPreferred: true,
    conflictDetected: false,
    rowCreatedAt: '2024-01-01T00:00:00Z',
    aumDollars: 1000.50,
    bolsaArg: 500.25,
    fondosArg: 300.75,
    bolsaBci: 200.00,
    pesos: 1000000,
    mep: 500.00,
    cable: 400.00,
    cv7000: 300.00,
    createdAt: '2024-01-01T00:00:00Z'
  };

  it('debería aceptar fila válida completa', () => {
    expect(aumRowSchema.parse(validRow)).toEqual(validRow);
  });

  it('debería aceptar con valores null', () => {
    const withNulls = {
      ...validRow,
      accountNumber: null,
      holderName: null,
      advisorRaw: null,
      advisorNormalized: null,
      matchedContactId: null,
      matchedUserId: null,
      aumDollars: null,
      bolsaArg: null
    };
    expect(aumRowSchema.parse(withNulls)).toEqual(withNulls);
  });

  it('debería aceptar con campos opcionales', () => {
    const withOptionals = {
      ...validRow,
      idCuenta: 'CUENTA123',
      suggestedUserId: '123e4567-e89b-12d3-a456-426614174004',
      needsConfirmation: true,
      rowUpdatedAt: '2024-01-02T00:00:00Z',
      isUpdated: true,
      updatedByFile: {
        id: '123e4567-e89b-12d3-a456-426614174005',
        name: 'file.csv',
        createdAt: '2024-01-01T00:00:00Z'
      },
      updatedAt: '2024-01-02T00:00:00Z'
    };
    expect(aumRowSchema.parse(withOptionals)).toEqual(withOptionals);
  });

  it('debería aceptar con relaciones anidadas', () => {
    const withRelations = {
      ...validRow,
      file: {
        id: '123e4567-e89b-12d3-a456-426614174006',
        broker: 'test-broker',
        originalFilename: 'test.csv',
        mimeType: 'text/csv',
        sizeBytes: 1024,
        uploadedByUserId: '123e4567-e89b-12d3-a456-426614174007',
        status: 'processed',
        createdAt: '2024-01-01T00:00:00Z'
      },
      contact: {
        id: '123e4567-e89b-12d3-a456-426614174008',
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe'
      },
      user: {
        id: '123e4567-e89b-12d3-a456-426614174009',
        name: 'Advisor Name',
        email: 'advisor@example.com'
      },
      raw: {
        customField: 'value',
        anotherField: 123
      }
    };
    expect(aumRowSchema.parse(withRelations)).toEqual(withRelations);
  });

  it('debería aceptar contact y user como null', () => {
    const withNullRelations = {
      ...validRow,
      contact: null,
      user: null
    };
    expect(aumRowSchema.parse(withNullRelations)).toEqual(withNullRelations);
  });

  it('debería rechazar matchStatus inválido', () => {
    expect(() => aumRowSchema.parse({ ...validRow, matchStatus: 'invalid' })).toThrow();
  });

  it('debería rechazar UUIDs inválidos', () => {
    expect(() => aumRowSchema.parse({ ...validRow, id: 'invalid' })).toThrow();
    expect(() => aumRowSchema.parse({ ...validRow, fileId: 'invalid' })).toThrow();
  });

  it('debería rechazar campos requeridos faltantes', () => {
    expect(() => aumRowSchema.parse({})).toThrow();
    expect(() => aumRowSchema.parse({ id: validRow.id })).toThrow();
  });
});

describe('aumUploadResponseSchema', () => {
  const validUploadResponse = {
    fileId: '123e4567-e89b-12d3-a456-426614174000',
    filename: 'test.csv',
    totals: {
      parsed: 100,
      matched: 80,
      ambiguous: 10,
      conflicts: 5,
      unmatched: 5
    },
    confirmationsRequired: 2,
    confirmations: [
      {
        rowId: '123e4567-e89b-12d3-a456-426614174001',
        idCuenta: 'CUENTA123',
        newAccountNumber: 'NEW123',
        reason: 'Account number mismatch'
      }
    ]
  };

  it('debería aceptar respuesta válida completa', () => {
    expect(aumUploadResponseSchema.parse(validUploadResponse)).toEqual(validUploadResponse);
  });

  it('debería aceptar con warnings opcionales', () => {
    const withWarnings = {
      ...validUploadResponse,
      warnings: ['Warning 1', 'Warning 2']
    };
    expect(aumUploadResponseSchema.parse(withWarnings)).toEqual(withWarnings);
  });

  it('debería aceptar confirmaciones con valores null', () => {
    const withNulls = {
      ...validUploadResponse,
      confirmations: [
        {
          rowId: '123e4567-e89b-12d3-a456-426614174001',
          idCuenta: null,
          newAccountNumber: null,
          reason: 'Some reason'
        }
      ]
    };
    expect(aumUploadResponseSchema.parse(withNulls)).toEqual(withNulls);
  });

  it('debería aceptar array de confirmaciones vacío', () => {
    const emptyConfirmations = {
      ...validUploadResponse,
      confirmations: [],
      confirmationsRequired: 0
    };
    expect(aumUploadResponseSchema.parse(emptyConfirmations)).toEqual(emptyConfirmations);
  });

  it('debería rechazar campos requeridos faltantes', () => {
    expect(() => aumUploadResponseSchema.parse({})).toThrow();
    expect(() => aumUploadResponseSchema.parse({ fileId: validUploadResponse.fileId })).toThrow();
  });

  it('debería rechazar tipos incorrectos en confirmaciones', () => {
    expect(() => aumUploadResponseSchema.parse({
      ...validUploadResponse,
      confirmations: [{ invalid: 'data' }]
    })).toThrow();
  });
});

describe('aumRowsResponseSchema', () => {
  const validRowsResponse = {
    ok: true,
    rows: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileId: '123e4567-e89b-12d3-a456-426614174001',
        accountNumber: '123456',
        holderName: 'John Doe',
        advisorRaw: 'Advisor',
        advisorNormalized: 'advisor',
        matchedContactId: null,
        matchedUserId: null,
        matchStatus: 'matched' as const,
        isPreferred: true,
        conflictDetected: false,
        rowCreatedAt: '2024-01-01T00:00:00Z',
        aumDollars: 1000,
        bolsaArg: null,
        fondosArg: null,
        bolsaBci: null,
        pesos: null,
        mep: null,
        cable: null,
        cv7000: null,
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    pagination: {
      total: 1,
      limit: 50,
      offset: 0,
      hasMore: false
    }
  };

  it('debería aceptar respuesta válida completa', () => {
    expect(aumRowsResponseSchema.parse(validRowsResponse)).toEqual(validRowsResponse);
  });

  it('debería aceptar array de filas vacío', () => {
    const emptyRows = {
      ...validRowsResponse,
      rows: [],
      pagination: {
        ...validRowsResponse.pagination,
        total: 0
      }
    };
    expect(aumRowsResponseSchema.parse(emptyRows)).toEqual(emptyRows);
  });

  it('debería aceptar ok: false', () => {
    const notOk = {
      ...validRowsResponse,
      ok: false
    };
    expect(aumRowsResponseSchema.parse(notOk)).toEqual(notOk);
  });

  it('debería rechazar paginación inválida', () => {
    expect(() => aumRowsResponseSchema.parse({
      ...validRowsResponse,
      pagination: {}
    })).toThrow();
  });
});

describe('aumHistoryResponseSchema', () => {
  const validHistoryResponse = {
    files: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        broker: 'test-broker',
        originalFilename: 'test.csv',
        mimeType: 'text/csv',
        sizeBytes: 1024,
        uploadedByUserId: '123e4567-e89b-12d3-a456-426614174001',
        status: 'processed',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    pagination: {
      limit: 50,
      offset: 0,
      total: 1
    }
  };

  it('debería aceptar respuesta válida completa', () => {
    expect(aumHistoryResponseSchema.parse(validHistoryResponse)).toEqual(validHistoryResponse);
  });

  it('debería aceptar array de archivos vacío', () => {
    const emptyFiles = {
      ...validHistoryResponse,
      files: [],
      pagination: {
        ...validHistoryResponse.pagination,
        total: 0
      }
    };
    expect(aumHistoryResponseSchema.parse(emptyFiles)).toEqual(emptyFiles);
  });

  it('debería rechazar paginación inválida', () => {
    expect(() => aumHistoryResponseSchema.parse({
      ...validHistoryResponse,
      pagination: { limit: 50 }
    })).toThrow();
  });
});

describe('aumMatchRowResponseSchema', () => {
  const validMatchResponse = {
    success: true,
    row: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      fileId: '123e4567-e89b-12d3-a456-426614174001',
      accountNumber: '123456',
      holderName: 'John Doe',
      advisorRaw: 'Advisor',
      advisorNormalized: 'advisor',
      matchedContactId: null,
      matchedUserId: null,
      matchStatus: 'matched' as const,
      isPreferred: true,
      conflictDetected: false,
      rowCreatedAt: '2024-01-01T00:00:00Z',
      aumDollars: null,
      bolsaArg: null,
      fondosArg: null,
      bolsaBci: null,
      pesos: null,
      mep: null,
      cable: null,
      cv7000: null,
      createdAt: '2024-01-01T00:00:00Z'
    },
    message: 'Match successful'
  };

  it('debería aceptar respuesta válida completa', () => {
    expect(aumMatchRowResponseSchema.parse(validMatchResponse)).toEqual(validMatchResponse);
  });

  it('debería aceptar sin row cuando success es false', () => {
    const failureResponse = {
      success: false,
      message: 'Match failed'
    };
    expect(aumMatchRowResponseSchema.parse(failureResponse)).toEqual(failureResponse);
  });

  it('debería aceptar sin message', () => {
    const withoutMessage = {
      success: true,
      row: validMatchResponse.row
    };
    expect(aumMatchRowResponseSchema.parse(withoutMessage)).toEqual(withoutMessage);
  });

  it('debería rechazar success: true sin row', () => {
    expect(() => aumMatchRowResponseSchema.parse({
      success: true
    })).toThrow();
  });
});

describe('Type inference', () => {
  it('debería inferir tipos correctamente para AumUploadResponse', () => {
    const response: AumUploadResponse = {
      fileId: '123e4567-e89b-12d3-a456-426614174000',
      filename: 'test.csv',
      totals: {
        parsed: 100,
        matched: 80,
        ambiguous: 10,
        conflicts: 5,
        unmatched: 5
      },
      confirmationsRequired: 0,
      confirmations: []
    };
    expect(aumUploadResponseSchema.parse(response)).toEqual(response);
  });

  it('debería inferir tipos correctamente para AumRowsResponse', () => {
    const response: AumRowsResponse = {
      ok: true,
      rows: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    };
    expect(aumRowsResponseSchema.parse(response)).toEqual(response);
  });

  it('debería inferir tipos correctamente para AumHistoryResponse', () => {
    const response: AumHistoryResponse = {
      files: [],
      pagination: {
        limit: 50,
        offset: 0,
        total: 0
      }
    };
    expect(aumHistoryResponseSchema.parse(response)).toEqual(response);
  });

  it('debería inferir tipos correctamente para AumMatchRowResponse', () => {
    const response: AumMatchRowResponse = {
      success: false,
      message: 'Error'
    };
    expect(aumMatchRowResponseSchema.parse(response)).toEqual(response);
  });
});

