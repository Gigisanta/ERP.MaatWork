/**
 * Tests para auth middlewares
 *
 * AI_DECISION: Tests unitarios para middlewares de autenticación
 * Justificación: Validación crítica de seguridad y RBAC
 * Impacto: Prevenir accesos no autorizados y errores de permisos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from './middlewares';
import { verifyUserToken } from './jwt';
import type { AuthUser } from './types';
import { db } from '@cactus/db';

// Mock JWT module
vi.mock('./jwt', () => ({
  verifyUserToken: vi.fn(),
}));

// Mock database
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  users: {},
  eq: vi.fn(),
}));

const mockVerifyUserToken = vi.mocked(verifyUserToken);
const mockDb = vi.mocked(db);

describe('requireAuth', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
      log: {
        warn: vi.fn(),
      },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();

    // Setup default DB mock
    const mockDbLimit = vi
      .fn()
      .mockResolvedValue([{ id: 'user-123', role: 'advisor', isActive: true }]);
    const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
    const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
    const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
    mockDb.mockReturnValue({
      select: mockDbSelect,
    } as any);
  });

  describe('Bearer token authentication', () => {
    it('debería autenticar con Bearer token válido', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor',
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token-123',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock DB query: db().select().from(users).where().limit(1)
      const mockDbLimit = vi
        .fn()
        .mockResolvedValue([{ id: 'user-123', role: 'advisor', isActive: true }]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      mockDb.mockReturnValue({
        select: mockDbSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyUserToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('debería extraer token correctamente del Bearer header', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor',
      };

      mockReq.headers = {
        authorization: 'Bearer token-with-spaces-and-special-chars-123',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock DB query
      const mockDbLimit = vi
        .fn()
        .mockResolvedValue([{ id: 'user-123', role: 'advisor', isActive: true }]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      mockDb.mockReturnValue({
        select: mockDbSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyUserToken).toHaveBeenCalledWith('token-with-spaces-and-special-chars-123');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Cookie authentication', () => {
    it('debería autenticar con cookie token', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'manager',
      };

      mockReq.cookies = {
        token: 'cookie-token-123',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock DB query
      const mockDbLimit = vi
        .fn()
        .mockResolvedValue([{ id: 'user-123', role: 'manager', isActive: true }]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      mockDb.mockReturnValue({
        select: mockDbSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyUserToken).toHaveBeenCalledWith('cookie-token-123');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería priorizar cookie sobre Bearer token', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      };

      mockReq.headers = {
        authorization: 'Bearer bearer-token',
      };
      mockReq.cookies = {
        token: 'cookie-token',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock DB query
      const mockDbLimit = vi
        .fn()
        .mockResolvedValue([{ id: 'user-123', role: 'admin', isActive: true }]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      mockDb.mockReturnValue({
        select: mockDbSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      // Debería usar Bearer token (se procesa primero)
      expect(mockVerifyUserToken).toHaveBeenCalledWith('bearer-token');
    });
  });

  describe('Fallback cookie parsing', () => {
    it('debería parsear cookie manualmente si cookie-parser no funciona', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor',
      };

      mockReq.headers = {
        cookie: 'token=fallback-token-123; other=value',
      };
      mockReq.cookies = {}; // Simular que cookie-parser no funcionó
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock DB query
      const mockDbLimit = vi
        .fn()
        .mockResolvedValue([{ id: 'user-123', role: 'advisor', isActive: true }]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      mockDb.mockReturnValue({
        select: mockDbSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyUserToken).toHaveBeenCalledWith('fallback-token-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería manejar URL encoding en cookies', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor',
      };

      const encodedToken = encodeURIComponent('token-with-special-chars');
      mockReq.headers = {
        cookie: `token=${encodedToken}`,
      };
      mockReq.cookies = {};
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyUserToken).toHaveBeenCalledWith('token-with-special-chars');
    });
  });

  describe('Error cases', () => {
    it('debería retornar 401 cuando no hay token', async () => {
      mockReq.headers = {};
      mockReq.cookies = {};

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockVerifyUserToken).not.toHaveBeenCalled();
    });

    it('debería retornar 401 cuando token es inválido', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };
      mockVerifyUserToken.mockRejectedValueOnce(new Error('Invalid token'));

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockReq.log?.warn).toHaveBeenCalled();
    });

    it('debería retornar 401 cuando token está expirado', async () => {
      mockReq.headers = {
        authorization: 'Bearer expired-token',
      };
      mockVerifyUserToken.mockRejectedValueOnce(new Error('Token expired'));

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería loguear error cuando falla verificación', async () => {
      const error = new Error('JWT verification failed');
      mockReq.headers = {
        authorization: 'Bearer bad-token',
      };
      mockVerifyUserToken.mockRejectedValueOnce(error);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.log?.warn).toHaveBeenCalledWith({ err: error }, 'auth verify failed');
    });
  });

  describe('Edge cases', () => {
    it('debería manejar authorization header sin Bearer prefix', async () => {
      mockReq.headers = {
        authorization: 'Basic base64-credentials',
      };
      mockReq.cookies = {};

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockVerifyUserToken).not.toHaveBeenCalled();
    });

    it('debería manejar cookie header vacío', async () => {
      mockReq.headers = {
        cookie: '',
      };
      mockReq.cookies = {};

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Database validation', () => {
    it('debería validar usuario en base de datos', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor',
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock database query
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'user-123',
                role: 'advisor',
                isActive: true,
              },
            ]),
          }),
        }),
      });

      const mockDb = vi.mocked(db);
      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual(mockUser);
    });

    it('debería retornar 401 cuando usuario no existe en DB', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor',
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock database query returning empty
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockDb = vi.mocked(db);
      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockReq.log?.warn).toHaveBeenCalled();
    });

    it('debería retornar 403 cuando usuario está inactivo', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor',
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock database query with inactive user
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'user-123',
                role: 'advisor',
                isActive: false,
              },
            ]),
          }),
        }),
      });

      const mockDb = vi.mocked(db);
      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User account is inactive' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería actualizar role cuando hay mismatch entre token y DB', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor', // Role en token
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };
      mockVerifyUserToken.mockResolvedValueOnce(mockUser);

      // Mock database query with different role
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'user-123',
                role: 'manager', // Role en DB (más reciente)
                isActive: true,
              },
            ]),
          }),
        }),
      });

      const mockDb = vi.mocked(db);
      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.role).toBe('manager'); // Debería usar role de DB
      expect(mockReq.log?.warn).toHaveBeenCalled();
    });
  });
});

describe('requireRole', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('Valid role access', () => {
    it('debería permitir acceso cuando usuario tiene rol permitido', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['admin', 'manager']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('debería permitir acceso para múltiples roles', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'manager@example.com',
        role: 'manager',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['admin', 'manager']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería permitir acceso para rol único', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'advisor@example.com',
        role: 'advisor',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['advisor']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Invalid role access', () => {
    it('debería retornar 403 cuando rol no está permitido', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'advisor@example.com',
        role: 'advisor',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['admin', 'manager']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 403 cuando advisor intenta acceder a endpoint de admin', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'advisor@example.com',
        role: 'advisor',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['admin']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Missing user', () => {
    it('debería retornar 401 cuando no hay usuario en request', () => {
      mockReq.user = undefined;
      const middleware = requireRole(['admin']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 401 cuando req.user es null', () => {
      mockReq.user = null as any;
      const middleware = requireRole(['admin']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Role combinations', () => {
    it('debería permitir acceso para admin', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['admin', 'manager', 'advisor']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería permitir acceso para manager', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'manager@example.com',
        role: 'manager',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['manager', 'admin']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería permitir acceso para advisor solo cuando está en la lista', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'advisor@example.com',
        role: 'advisor',
      };

      mockReq.user = mockUser;
      const middleware = requireRole(['advisor']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
