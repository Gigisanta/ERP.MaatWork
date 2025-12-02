/**
 * Mock estandarizado de multer para tests
 *
 * AI_DECISION: Centralizar mock de multer para consistencia en tests
 * Justificación: Evitar duplicación y asegurar comportamiento consistente
 * Impacto: Tests más mantenibles y predecibles
 */

import { vi } from 'vitest';

export class MulterError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'MulterError';
  }
}

export interface MulterStorage {
  _handleFile: ReturnType<typeof vi.fn>;
  _removeFile: ReturnType<typeof vi.fn>;
}

export interface MulterOptions {
  destination?: string;
  filename?: (
    req: unknown,
    file: unknown,
    cb: (error: Error | null, filename: string) => void
  ) => void;
}

export function createMulterMock() {
  const mockDiskStorage = vi.fn((options?: MulterOptions): MulterStorage => {
    return {
      _handleFile: vi.fn(),
      _removeFile: vi.fn(),
      ...options,
    } as MulterStorage;
  });

  const mockMemoryStorage = vi.fn(() => ({}));

  const mockMulter = vi.fn((options?: unknown) => ({
    single: vi.fn(() => vi.fn()),
    array: vi.fn(() => vi.fn()),
    fields: vi.fn(() => vi.fn()),
    any: vi.fn(() => vi.fn()),
    none: vi.fn(() => vi.fn()),
  }));

  return {
    default: mockMulter,
    diskStorage: mockDiskStorage,
    memoryStorage: mockMemoryStorage,
    MulterError,
  };
}

/**
 * Función helper para crear el mock de multer compatible con vi.mock
 */
export function createMulterMockForVitest() {
  const mockDiskStorage = vi.fn((options?: MulterOptions) => {
    return {
      _handleFile: vi.fn(),
      _removeFile: vi.fn(),
      ...options,
    };
  });

  const mockMemoryStorage = vi.fn(() => ({}));

  const mockMulter = vi.fn((options?: unknown) => ({
    single: vi.fn(() => vi.fn()),
    array: vi.fn(() => vi.fn()),
    fields: vi.fn(() => vi.fn()),
    any: vi.fn(() => vi.fn()),
    none: vi.fn(() => vi.fn()),
  }));

  return {
    default: mockMulter,
    diskStorage: mockDiskStorage,
    memoryStorage: mockMemoryStorage,
    MulterError,
  };
}
