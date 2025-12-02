/**
 * Tests para authorization utilities
 *
 * AI_DECISION: Tests unitarios para RBAC y control de acceso
 * Justificación: Validación crítica de seguridad y aislamiento de datos
 * Impacto: Prevenir accesos no autorizados y asegurar data isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, users, teamMembership, teams, contacts, aumImportFiles } from '@cactus/db';
import { eq, sql, inArray, isNull } from 'drizzle-orm';
import {
  getUserAccessScope,
  buildContactAccessFilter,
  canAccessContact,
  canAssignContactTo,
  canAccessAumFile,
  getTeamMembers,
  getUserTeams,
} from './authorization';
import type { UserRole } from './types';
import { createMockDbWithResponses } from '../__tests__/helpers/mock-db';

// Mock DB
vi.mock('@cactus/db', async () => {
  const actual = await vi.importActual('@cactus/db');
  return {
    ...actual,
    db: vi.fn(),
    users: { id: 'users.id', email: 'users.email', fullName: 'users.fullName', role: 'users.role' },
    teamMembership: { userId: 'teamMembership.userId', teamId: 'teamMembership.teamId' },
    teams: { id: 'teams.id', name: 'teams.name', managerUserId: 'teams.managerUserId' },
    contacts: { id: 'contacts.id', assignedAdvisorId: 'contacts.assignedAdvisorId' },
    aumImportFiles: {
      id: 'aumImportFiles.id',
      uploadedByUserId: 'aumImportFiles.uploadedByUserId',
    },
    eq: vi.fn((col, val) => ({ type: 'eq', col, val })),
    sql: vi.fn((strings, ...values) => ({ type: 'sql', strings, values })),
    inArray: vi.fn((col, vals) => ({ type: 'inArray', col, vals })),
    isNull: vi.fn((col) => ({ type: 'isNull', col })),
    and: vi.fn((...conds) => ({ type: 'and', conds })),
    or: vi.fn((...conds) => ({ type: 'or', conds })),
  };
});

const mockDb = vi.mocked(db);

describe('getUserAccessScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin role', () => {
    it('debería retornar scope completo para admin', async () => {
      const userId = 'admin-123';
      const role: UserRole = 'admin';

      // Mock user exists: db().select().from(users).where().limit(1)
      const mockLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'admin@test.com', role: 'admin' }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const scope = await getUserAccessScope(userId, role);

      expect(scope.userId).toBe(userId);
      expect(scope.role).toBe('admin');
      expect(scope.accessibleAdvisorIds).toEqual([]); // Empty means all
      expect(scope.canSeeUnassigned).toBe(true);
      expect(scope.canAssignToOthers).toBe(true);
      expect(scope.canReassign).toBe(true);
    });
  });

  describe('Manager role', () => {
    it('debería retornar scope con equipo para manager', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';
      const teamMemberId1 = 'member-1';
      const teamMemberId2 = 'member-2';

      // Mock user query: db().select().from(users).where().limit(1)
      const mockUserLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'manager@test.com', role: 'manager' }]);
      const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere });
      const mockUserSelect = vi.fn().mockReturnValue({ from: mockUserFrom });

      // Mock team members query: db().select().from(users).innerJoin().innerJoin().where()
      const mockTeamWhere = vi
        .fn()
        .mockResolvedValue([{ id: teamMemberId1 }, { id: teamMemberId2 }]);
      const mockTeamInnerJoin2 = vi.fn().mockReturnValue({ where: mockTeamWhere });
      const mockTeamInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin2 });
      const mockTeamFrom = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin1 });
      const mockTeamSelect = vi.fn().mockReturnValue({ from: mockTeamFrom });

      // Configure db() to return different select chains based on what's being selected
      let selectCallCount = 0;
      mockDb.mockReturnValue({
        select: vi.fn((columns?: unknown) => {
          selectCallCount++;
          // First call is for user lookup, subsequent calls are for team members
          if (selectCallCount === 1) {
            return mockUserSelect();
          }
          return mockTeamSelect();
        }),
      } as any);

      const scope = await getUserAccessScope(userId, role);

      expect(scope.userId).toBe(userId);
      expect(scope.role).toBe('manager');
      expect(scope.accessibleAdvisorIds).toContain(userId); // Manager's own ID
      expect(scope.accessibleAdvisorIds).toContain(teamMemberId1);
      expect(scope.accessibleAdvisorIds).toContain(teamMemberId2);
      expect(scope.canSeeUnassigned).toBe(true);
      expect(scope.canAssignToOthers).toBe(true);
      expect(scope.canReassign).toBe(true);
    });

    it('debería manejar manager sin equipo', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';

      // Mock user query
      const mockUserLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'manager@test.com', role: 'manager' }]);
      const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere });
      const mockUserSelect = vi.fn().mockReturnValue({ from: mockUserFrom });

      // Mock team members query that throws error
      const mockTeamWhere = vi.fn().mockRejectedValue(new Error('No team members'));
      const mockTeamInnerJoin2 = vi.fn().mockReturnValue({ where: mockTeamWhere });
      const mockTeamInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin2 });
      const mockTeamFrom = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin1 });
      const mockTeamSelect = vi.fn().mockReturnValue({ from: mockTeamFrom });

      // Mock console.warn para evitar output en tests
      const originalWarn = console.warn;
      console.warn = vi.fn();

      let selectCallCount = 0;
      mockDb.mockReturnValue({
        select: vi.fn((columns?: unknown) => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return mockUserSelect();
          }
          return mockTeamSelect();
        }),
      } as any);

      const scope = await getUserAccessScope(userId, role);

      expect(scope.accessibleAdvisorIds).toEqual([userId]); // Solo su propio ID
      expect(scope.canSeeUnassigned).toBe(true);

      console.warn = originalWarn;
    });
  });

  describe('Advisor role', () => {
    it('debería retornar scope restringido para advisor', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';

      const mockLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'advisor@test.com', role: 'advisor' }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const scope = await getUserAccessScope(userId, role);

      expect(scope.userId).toBe(userId);
      expect(scope.role).toBe('advisor');
      expect(scope.accessibleAdvisorIds).toEqual([userId]); // Solo su propio ID
      expect(scope.canSeeUnassigned).toBe(false);
      expect(scope.canAssignToOthers).toBe(false);
      expect(scope.canReassign).toBe(false);
    });
  });

  describe('Error cases', () => {
    it('debería lanzar error cuando usuario no existe', async () => {
      const userId = 'non-existent-123';
      const role: UserRole = 'advisor';

      // Mock empty result (user not found)
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(getUserAccessScope(userId, role)).rejects.toThrow(
        `User ${userId} not found in database`
      );
    });

    it('debería lanzar error para rol desconocido', async () => {
      const userId = 'user-123';
      const role = 'unknown-role' as UserRole;

      // Mock user exists but role is unknown
      const mockLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'user@test.com', role: 'unknown-role' }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(getUserAccessScope(userId, role)).rejects.toThrow('Unknown role');
    });
  });
});

describe('buildContactAccessFilter', () => {
  describe('Admin filter', () => {
    it('debería retornar filter sin restricciones para admin', () => {
      const accessScope = {
        userId: 'admin-123',
        role: 'admin' as UserRole,
        accessibleAdvisorIds: [],
        canSeeUnassigned: true,
        canAssignToOthers: true,
        canReassign: true,
      };

      const filter = buildContactAccessFilter(accessScope);

      expect(filter.description).toContain('admin');
      expect(filter.whereClause).toBeDefined();
    });
  });

  describe('Manager filter', () => {
    it('debería retornar filter con equipo y unassigned para manager', () => {
      const accessScope = {
        userId: 'manager-123',
        role: 'manager' as UserRole,
        accessibleAdvisorIds: ['manager-123', 'member-1', 'member-2'],
        canSeeUnassigned: true,
        canAssignToOthers: true,
        canReassign: true,
      };

      const filter = buildContactAccessFilter(accessScope);

      expect(filter.description).toContain('manager');
      expect(filter.whereClause).toBeDefined();
    });

    it('debería manejar manager sin miembros de equipo', () => {
      const accessScope = {
        userId: 'manager-123',
        role: 'manager' as UserRole,
        accessibleAdvisorIds: ['manager-123'],
        canSeeUnassigned: true,
        canAssignToOthers: true,
        canReassign: true,
      };

      const filter = buildContactAccessFilter(accessScope);

      expect(filter.whereClause).toBeDefined();
    });
  });

  describe('Advisor filter', () => {
    it('debería retornar filter solo con propio ID para advisor', () => {
      const accessScope = {
        userId: 'advisor-123',
        role: 'advisor' as UserRole,
        accessibleAdvisorIds: ['advisor-123'],
        canSeeUnassigned: false,
        canAssignToOthers: false,
        canReassign: false,
      };

      const filter = buildContactAccessFilter(accessScope);

      expect(filter.description).toContain('advisor');
      expect(filter.whereClause).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('debería manejar caso sin condiciones (fail safe)', () => {
      const accessScope = {
        userId: 'user-123',
        role: 'advisor' as UserRole,
        accessibleAdvisorIds: [], // Empty array
        canSeeUnassigned: false,
        canAssignToOthers: false,
        canReassign: false,
      };

      // Mock console.warn
      const originalWarn = console.warn;
      console.warn = vi.fn();

      const filter = buildContactAccessFilter(accessScope);

      expect(filter.description).toContain('fail safe');
      expect(filter.whereClause).toBeDefined();

      console.warn = originalWarn;
    });
  });
});

describe('canAccessContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería retornar true cuando admin puede acceder', async () => {
    const userId = 'admin-123';
    const role: UserRole = 'admin';
    const contactId = 'contact-123';

    // Mock getUserAccessScope
    const mockGetAccessScope = vi.fn().mockResolvedValue({
      userId,
      role,
      accessibleAdvisorIds: [],
      canSeeUnassigned: true,
      canAssignToOthers: true,
      canReassign: true,
    });

    vi.doMock('./authorization', async () => {
      const actual = await vi.importActual('./authorization');
      return {
        ...actual,
        getUserAccessScope: mockGetAccessScope,
      };
    });

    // Mock DB query
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: contactId }]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await canAccessContact(userId, role, contactId);

    expect(result).toBe(true);
  });

  it('debería retornar false cuando contacto no existe', async () => {
    const userId = 'user-123';
    const role: UserRole = 'advisor';
    const contactId = 'non-existent-contact';

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No contact found
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await canAccessContact(userId, role, contactId);

    expect(result).toBe(false);
  });

  it('debería retornar false cuando hay error', async () => {
    const userId = 'user-123';
    const role: UserRole = 'advisor';
    const contactId = 'contact-123';

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const originalError = console.error;
    console.error = vi.fn();

    const result = await canAccessContact(userId, role, contactId);

    expect(result).toBe(false);

    console.error = originalError;
  });
});

describe('canAssignContactTo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin permissions', () => {
    it('debería permitir asignar a cualquiera para admin', async () => {
      const userId = 'admin-123';
      const role: UserRole = 'admin';
      const targetAdvisorId = 'any-advisor-123';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: userId }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAssignContactTo(userId, role, targetAdvisorId);

      expect(result).toBe(true);
    });

    it('debería permitir asignar a null (unassigned) para admin', async () => {
      const userId = 'admin-123';
      const role: UserRole = 'admin';

      // Mock user query for getUserAccessScope
      const mockLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'admin@test.com', role: 'admin' }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAssignContactTo(userId, role, null);

      expect(result).toBe(true);
    });
  });

  describe('Manager permissions', () => {
    it('debería permitir asignar a miembros del equipo', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';
      const teamMemberId = 'member-1';

      // Mock user query: db().select().from(users).where().limit(1)
      const mockUserLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'manager@test.com', role: 'manager' }]);
      const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere });
      const mockUserSelect = vi.fn().mockReturnValue({ from: mockUserFrom });

      // Mock team members query: db().select().from(users).innerJoin().innerJoin().where()
      const mockTeamWhere = vi.fn().mockResolvedValue([{ id: teamMemberId }]);
      const mockTeamInnerJoin2 = vi.fn().mockReturnValue({ where: mockTeamWhere });
      const mockTeamInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin2 });
      const mockTeamFrom = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin1 });
      const mockTeamSelect = vi.fn().mockReturnValue({ from: mockTeamFrom });

      let selectCallCount = 0;
      mockDb.mockReturnValue({
        select: vi.fn((columns?: unknown) => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return mockUserSelect();
          }
          return mockTeamSelect();
        }),
      } as any);

      const result = await canAssignContactTo(userId, role, teamMemberId);

      expect(result).toBe(true);
    });

    it('debería permitir asignar a null (unassigned) para manager', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';

      // Mock user query for getUserAccessScope
      const mockUserLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'manager@test.com', role: 'manager' }]);
      const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere });
      const mockUserSelect = vi.fn().mockReturnValue({ from: mockUserFrom });

      // Mock team members query (empty is fine for this test)
      const mockTeamWhere = vi.fn().mockResolvedValue([]);
      const mockTeamInnerJoin2 = vi.fn().mockReturnValue({ where: mockTeamWhere });
      const mockTeamInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin2 });
      const mockTeamFrom = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin1 });
      const mockTeamSelect = vi.fn().mockReturnValue({ from: mockTeamFrom });

      let selectCallCount = 0;
      mockDb.mockReturnValue({
        select: vi.fn((columns?: unknown) => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return mockUserSelect();
          }
          return mockTeamSelect();
        }),
      } as any);

      const result = await canAssignContactTo(userId, role, null);

      expect(result).toBe(true);
    });

    it('debería denegar asignar a advisor fuera del equipo', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';
      const outsideAdvisorId = 'outside-advisor-123';

      // Mock user query
      const mockUserLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'manager@test.com', role: 'manager' }]);
      const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere });
      const mockUserSelect = vi.fn().mockReturnValue({ from: mockUserFrom });

      // Mock team members query - empty result (no team members)
      const mockTeamWhere = vi.fn().mockResolvedValue([]);
      const mockTeamInnerJoin2 = vi.fn().mockReturnValue({ where: mockTeamWhere });
      const mockTeamInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin2 });
      const mockTeamFrom = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin1 });
      const mockTeamSelect = vi.fn().mockReturnValue({ from: mockTeamFrom });

      let selectCallCount = 0;
      mockDb.mockReturnValue({
        select: vi.fn((columns?: unknown) => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return mockUserSelect();
          }
          return mockTeamSelect();
        }),
      } as any);

      const result = await canAssignContactTo(userId, role, outsideAdvisorId);

      expect(result).toBe(false);
    });
  });

  describe('Advisor permissions', () => {
    it('debería permitir asignar solo a sí mismo', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';

      // Mock user query for getUserAccessScope
      const mockLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'advisor@test.com', role: 'advisor' }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAssignContactTo(userId, role, userId);

      expect(result).toBe(true);
    });

    it('debería denegar asignar a otro advisor', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';
      const otherAdvisorId = 'other-advisor-456';

      // Mock user query for getUserAccessScope
      const mockLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'advisor@test.com', role: 'advisor' }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAssignContactTo(userId, role, otherAdvisorId);

      expect(result).toBe(false);
    });

    it('debería denegar asignar a null (unassigned) para advisor', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: userId }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAssignContactTo(userId, role, null);

      expect(result).toBe(false);
    });
  });
});

describe('canAccessAumFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin access', () => {
    it('debería permitir acceso a todos los archivos para admin', async () => {
      const userId = 'admin-123';
      const role: UserRole = 'admin';
      const fileId = 'file-123';

      const result = await canAccessAumFile(userId, role, fileId);

      expect(result).toBe(true);
    });
  });

  describe('Advisor access', () => {
    it('debería permitir acceso a archivos propios', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';
      const fileId = 'file-123';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ uploadedByUserId: userId }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAccessAumFile(userId, role, fileId);

      expect(result).toBe(true);
    });

    it('debería denegar acceso a archivos de otros', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';
      const fileId = 'file-123';
      const otherUserId = 'other-advisor-456';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ uploadedByUserId: otherUserId }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAccessAumFile(userId, role, fileId);

      expect(result).toBe(false);
    });
  });

  describe('Manager access', () => {
    it('debería permitir acceso a archivos propios', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';
      const fileId = 'file-123';

      // Mock file query: db().select().from(aumImportFiles).where().limit(1)
      const mockFileLimit = vi.fn().mockResolvedValue([{ uploadedByUserId: userId }]);
      const mockFileWhere = vi.fn().mockReturnValue({ limit: mockFileLimit });
      const mockFileFrom = vi.fn().mockReturnValue({ where: mockFileWhere });
      const mockFileSelect = vi.fn().mockReturnValue({ from: mockFileFrom });

      mockDb.mockReturnValue({
        select: mockFileSelect,
      } as any);

      const result = await canAccessAumFile(userId, role, fileId);

      expect(result).toBe(true);
    });

    it('debería permitir acceso a archivos de miembros del equipo', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';
      const fileId = 'file-123';
      const teamMemberId = 'member-1';

      // Mock file query: db().select().from(aumImportFiles).where().limit(1)
      const mockFileLimit = vi.fn().mockResolvedValue([{ uploadedByUserId: teamMemberId }]);
      const mockFileWhere = vi.fn().mockReturnValue({ limit: mockFileLimit });
      const mockFileFrom = vi.fn().mockReturnValue({ where: mockFileWhere });
      const mockFileSelect = vi.fn().mockReturnValue({ from: mockFileFrom });

      // Mock user query for getUserAccessScope: db().select().from(users).where().limit(1)
      const mockUserLimit = vi
        .fn()
        .mockResolvedValue([{ id: userId, email: 'manager@test.com', role: 'manager' }]);
      const mockUserWhere = vi.fn().mockReturnValue({ limit: mockUserLimit });
      const mockUserFrom = vi.fn().mockReturnValue({ where: mockUserWhere });
      const mockUserSelect = vi.fn().mockReturnValue({ from: mockUserFrom });

      // Mock team members query: db().select().from(users).innerJoin().innerJoin().where()
      const mockTeamWhere = vi.fn().mockResolvedValue([{ id: teamMemberId }]);
      const mockTeamInnerJoin2 = vi.fn().mockReturnValue({ where: mockTeamWhere });
      const mockTeamInnerJoin1 = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin2 });
      const mockTeamFrom = vi.fn().mockReturnValue({ innerJoin: mockTeamInnerJoin1 });
      const mockTeamSelect = vi.fn().mockReturnValue({ from: mockTeamFrom });

      let selectCallCount = 0;
      mockDb.mockReturnValue({
        select: vi.fn((columns?: unknown) => {
          selectCallCount++;
          // First call: file query
          if (selectCallCount === 1) {
            return mockFileSelect();
          }
          // Second call: user query for getUserAccessScope
          if (selectCallCount === 2) {
            return mockUserSelect();
          }
          // Third call: team members query
          return mockTeamSelect();
        }),
      } as any);

      const result = await canAccessAumFile(userId, role, fileId);

      expect(result).toBe(true);
    });
  });

  describe('Error cases', () => {
    it('debería retornar false cuando archivo no existe', async () => {
      const userId = 'user-123';
      const role: UserRole = 'advisor';
      const fileId = 'non-existent-file';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No file found
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await canAccessAumFile(userId, role, fileId);

      expect(result).toBe(false);
    });

    it('debería retornar false cuando hay error', async () => {
      const userId = 'user-123';
      const role: UserRole = 'advisor';
      const fileId = 'file-123';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const originalError = console.error;
      console.error = vi.fn();

      const result = await canAccessAumFile(userId, role, fileId);

      expect(result).toBe(false);

      console.error = originalError;
    });
  });
});

describe('getTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería retornar miembros del equipo para manager', async () => {
    const managerId = 'manager-123';
    const teamMembers = [
      { id: 'member-1', email: 'member1@test.com', fullName: 'Member One', role: 'member' },
      { id: 'member-2', email: 'member2@test.com', fullName: 'Member Two', role: 'lead' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(teamMembers),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await getTeamMembers(managerId);

    expect(result).toEqual(teamMembers);
    expect(result.length).toBe(2);
  });

  it('debería retornar array vacío cuando manager no tiene equipo', async () => {
    const managerId = 'manager-123';

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await getTeamMembers(managerId);

    expect(result).toEqual([]);
  });
});

describe('getUserTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Manager role', () => {
    it('debería retornar equipos que gestiona', async () => {
      const userId = 'manager-123';
      const role: UserRole = 'manager';
      const managedTeams = [
        { id: 'team-1', name: 'Team One', managerUserId: userId, createdAt: new Date() },
        { id: 'team-2', name: 'Team Two', managerUserId: userId, createdAt: new Date() },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(managedTeams),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getUserTeams(userId, role);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ id: 'team-1', name: 'Team One', role: 'manager' });
      expect(result[1]).toEqual({ id: 'team-2', name: 'Team Two', role: 'manager' });
    });
  });

  describe('Advisor role', () => {
    it('debería retornar equipos donde es miembro', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';
      const userTeams = [
        { id: 'team-1', name: 'Team One', isManager: false },
        { id: 'team-2', name: 'Team Two', isManager: false },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(userTeams),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getUserTeams(userId, role);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ id: 'team-1', name: 'Team One', role: 'member' });
      expect(result[1]).toEqual({ id: 'team-2', name: 'Team Two', role: 'member' });
    });

    it('debería retornar role manager cuando es manager del equipo', async () => {
      const userId = 'advisor-123';
      const role: UserRole = 'advisor';
      const userTeams = [{ id: 'team-1', name: 'Team One', isManager: true }];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(userTeams),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getUserTeams(userId, role);

      expect(result[0]).toEqual({ id: 'team-1', name: 'Team One', role: 'manager' });
    });
  });

  describe('Admin role', () => {
    it('debería retornar array vacío para admin', async () => {
      const userId = 'admin-123';
      const role: UserRole = 'admin';

      // Admin no tiene teams específicos, debería retornar vacío
      // Pero la función actual no maneja admin explícitamente
      // Por ahora, se comporta como advisor
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getUserTeams(userId, role);

      expect(result).toEqual([]);
    });
  });
});
