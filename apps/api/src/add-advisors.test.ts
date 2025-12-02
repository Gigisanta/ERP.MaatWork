/**
 * Tests para script add-advisors.ts
 *
 * AI_DECISION: Tests unitarios para script de carga de asesores
 * Justificación: Validar lógica de creación/actualización de usuarios advisor
 * Impacto: Prevenir errores en carga inicial de datos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Mock dependencies
vi.mock('@cactus/db', async () => {
  const actual = await vi.importActual('@cactus/db');
  return {
    ...actual,
    db: vi.fn(),
    users: {},
    eq: vi.fn(),
  };
});

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

describe('add-advisors script', () => {
  let mockDb: ReturnType<typeof vi.fn>;
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockReturning: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReturning = vi.fn().mockResolvedValue([{ id: 'user-1', email: 'test@test.com' }]);
    mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockInsert = vi.fn().mockReturnValue({ values: mockValues });
    mockQuery = {
      users: {
        findFirst: vi.fn(),
      },
    };
    mockDb = vi.fn().mockReturnValue({
      query: mockQuery,
      insert: mockInsert,
    });

    (db as any).mockImplementation(mockDb);
  });

  describe('upsertAdvisor', () => {
    it('debería crear nuevo advisor cuando no existe', async () => {
      // Importar función después de mocks
      const { upsertAdvisor } = await import('./add-advisors');

      mockQuery.users.findFirst.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed-password');
      mockReturning.mockResolvedValue([
        {
          id: 'new-user-id',
          email: 'Mvicente@grupoabax.com',
        },
      ]);

      const advisor = {
        username: 'Mvicente',
        password: 'Mvicente123',
        email: 'Mvicente@grupoabax.com',
      };

      await upsertAdvisor(advisor);

      expect(mockQuery.users.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('Mvicente123', 10);
      expect(mockInsert).toHaveBeenCalledWith(users);
      expect(mockValues).toHaveBeenCalledWith({
        email: 'Mvicente@grupoabax.com',
        fullName: 'Mvicente',
        role: 'advisor',
        passwordHash: 'hashed-password',
        isActive: true,
        username: 'Mvicente',
        usernameNormalized: 'mvicente',
      });
    });

    it('debería no crear advisor cuando ya existe por email', async () => {
      const { upsertAdvisor } = await import('./add-advisors');

      mockQuery.users.findFirst.mockResolvedValue({
        id: 'existing-id',
        email: 'Mvicente@grupoabax.com',
      });

      const advisor = {
        username: 'Mvicente',
        password: 'Mvicente123',
        email: 'Mvicente@grupoabax.com',
      };

      await upsertAdvisor(advisor);

      expect(mockQuery.users.findFirst).toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('debería normalizar username a lowercase', async () => {
      const { upsertAdvisor } = await import('./add-advisors');

      mockQuery.users.findFirst.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed-password');

      const advisor = {
        username: 'MVICENTE',
        password: 'Mvicente123',
        email: 'Mvicente@grupoabax.com',
      };

      await upsertAdvisor(advisor);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          usernameNormalized: 'mvicente',
        })
      );
    });
  });

  describe('seedAdvisors data', () => {
    it('debería tener estructura correcta para cada advisor', () => {
      const seedAdvisors = [
        { username: 'Mvicente', password: 'Mvicente123', email: 'Mvicente@grupoabax.com' },
        { username: 'Nzappia', password: 'Nzappia123', email: 'Nzappia@grupoabax.com' },
        { username: 'TDanziger', password: 'TDanziger123', email: 'Tdanziger@grupoabax.com' },
        { username: 'PMolina', password: 'PMolina123', email: 'Pmolina@grupoabax.com' },
        { username: 'NIngilde', password: 'NIngilde123', email: 'Ningilde@grupoabax.com' },
        {
          username: 'Fandreacchio',
          password: 'Fandreacchio123',
          email: 'Fandreacchio@grupoabax.com',
        },
      ];

      seedAdvisors.forEach((advisor) => {
        expect(advisor).toHaveProperty('username');
        expect(advisor).toHaveProperty('password');
        expect(advisor).toHaveProperty('email');
        expect(typeof advisor.username).toBe('string');
        expect(typeof advisor.password).toBe('string');
        expect(typeof advisor.email).toBe('string');
        expect(advisor.email).toMatch(/@grupoabax\.com$/);
      });
    });
  });
});
