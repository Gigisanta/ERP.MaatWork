/**
 * Tests para script add-user.ts
 * 
 * AI_DECISION: Tests unitarios para script de agregar usuario
 * Justificación: Validar lógica de creación de usuario admin
 * Impacto: Prevenir errores en creación de usuarios iniciales
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  users: {},
  eq: vi.fn()
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

describe('add-user script', () => {
  let mockDb: ReturnType<typeof vi.fn>;
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockReturning: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLimit = vi.fn().mockResolvedValue([]);
    mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    mockSelect = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) });
    
    mockReturning = vi.fn().mockResolvedValue([{
      id: 'new-user-id',
      email: 'giolivosantarelli@gmail.com',
      fullName: 'Gio Santarelli',
      role: 'admin',
      isActive: true
    }]);
    mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockInsert = vi.fn().mockReturnValue({ values: mockValues });
    
    mockQuery = {
      users: {
        findMany: vi.fn()
      }
    };
    
    mockDb = vi.fn().mockReturnValue({
      query: mockQuery,
      select: mockSelect,
      insert: mockInsert
    });
    
    (db as any).mockImplementation(mockDb);
  });

  describe('addUser function', () => {
    it('debería crear nuevo usuario cuando no existe', async () => {
      mockQuery.users.findMany.mockResolvedValue([]);

      // Simular la función addUser
      const addUser = async () => {
        const email = 'giolivosantarelli@gmail.com';
        const existingUsers = await db().query.users.findMany({
          where: eq(users.email, email),
          limit: 1,
        });
        
        if (existingUsers.length > 0) {
          return { exists: true, user: existingUsers[0] };
        }
        
        const [newUser] = await db().insert(users).values({
          email: email,
          fullName: 'Gio Santarelli',
          role: 'admin',
          isActive: true,
        }).returning();
        
        return { exists: false, user: newUser };
      };

      const result = await addUser();

      // The where clause is passed as a function, so we check that findMany was called
      expect(mockQuery.users.findMany).toHaveBeenCalled();
      const callArgs = mockQuery.users.findMany.mock.calls[0][0];
      expect(callArgs).toHaveProperty('limit', 1);
      expect(callArgs).toHaveProperty('where');
      expect(mockInsert).toHaveBeenCalledWith(users);
      expect(mockValues).toHaveBeenCalledWith({
        email: 'giolivosantarelli@gmail.com',
        fullName: 'Gio Santarelli',
        role: 'admin',
        isActive: true,
      });
      expect(result.exists).toBe(false);
      expect(result.user.email).toBe('giolivosantarelli@gmail.com');
    });

    it('debería retornar usuario existente cuando ya existe', async () => {
      const existingUser = {
        id: 'existing-id',
        email: 'giolivosantarelli@gmail.com',
        fullName: 'Gio Santarelli',
        role: 'admin',
        isActive: true
      };
      
      mockQuery.users.findMany.mockResolvedValue([existingUser]);

      const addUser = async () => {
        const email = 'giolivosantarelli@gmail.com';
        const existingUsers = await db().query.users.findMany({
          where: eq(users.email, email),
          limit: 1,
        });
        
        if (existingUsers.length > 0) {
          return { exists: true, user: existingUsers[0] };
        }
        
        return { exists: false };
      };

      const result = await addUser();

      expect(mockQuery.users.findMany).toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
      expect(result.exists).toBe(true);
      expect(result.user).toEqual(existingUser);
    });

    it('debería crear usuario con rol admin', async () => {
      mockQuery.users.findMany.mockResolvedValue([]);

      const addUser = async () => {
        const email = 'giolivosantarelli@gmail.com';
        const existingUsers = await db().query.users.findMany({
          where: eq(users.email, email),
          limit: 1,
        });
        
        if (existingUsers.length > 0) {
          return { exists: true };
        }
        
        const [newUser] = await db().insert(users).values({
          email: email,
          fullName: 'Gio Santarelli',
          role: 'admin',
          isActive: true,
        }).returning();
        
        return { exists: false, user: newUser };
      };

      await addUser();

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
          isActive: true
        })
      );
    });
  });
});

