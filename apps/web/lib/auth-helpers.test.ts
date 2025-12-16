/**
 * Tests para auth-helpers
 */

import { describe, it, expect } from 'vitest';
import { isAdmin, canImportFiles, canEditSharedResources, isManagerOrAdmin } from './auth-helpers';
import type { AuthUser } from '../app/auth/AuthContext';

describe('auth-helpers', () => {
  const mockAdminUser: AuthUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'admin',
    fullName: 'Admin User',
  };

  const mockManagerUser: AuthUser = {
    id: 'manager-1',
    email: 'manager@test.com',
    role: 'manager',
    fullName: 'Manager User',
  };

  const mockAdvisorUser: AuthUser = {
    id: 'advisor-1',
    email: 'advisor@test.com',
    role: 'advisor',
    fullName: 'Advisor User',
  };

  describe('isAdmin', () => {
    it('debería retornar true para usuario admin', () => {
      expect(isAdmin(mockAdminUser)).toBe(true);
    });

    it('debería retornar false para usuario manager', () => {
      expect(isAdmin(mockManagerUser)).toBe(false);
    });

    it('debería retornar false para usuario advisor', () => {
      expect(isAdmin(mockAdvisorUser)).toBe(false);
    });

    it('debería retornar false para usuario null', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('canImportFiles', () => {
    it('debería retornar true para usuario admin', () => {
      expect(canImportFiles(mockAdminUser)).toBe(true);
    });

    it('debería retornar false para usuario manager', () => {
      expect(canImportFiles(mockManagerUser)).toBe(false);
    });

    it('debería retornar false para usuario advisor', () => {
      expect(canImportFiles(mockAdvisorUser)).toBe(false);
    });

    it('debería retornar false para usuario null', () => {
      expect(canImportFiles(null)).toBe(false);
    });
  });

  describe('canEditSharedResources', () => {
    it('debería retornar true para usuario admin', () => {
      expect(canEditSharedResources(mockAdminUser)).toBe(true);
    });

    it('debería retornar false para usuario manager', () => {
      expect(canEditSharedResources(mockManagerUser)).toBe(false);
    });

    it('debería retornar false para usuario advisor', () => {
      expect(canEditSharedResources(mockAdvisorUser)).toBe(false);
    });

    it('debería retornar false para usuario null', () => {
      expect(canEditSharedResources(null)).toBe(false);
    });
  });

  describe('isManagerOrAdmin', () => {
    it('debería retornar true para usuario admin', () => {
      expect(isManagerOrAdmin(mockAdminUser)).toBe(true);
    });

    it('debería retornar true para usuario manager', () => {
      expect(isManagerOrAdmin(mockManagerUser)).toBe(true);
    });

    it('debería retornar false para usuario advisor', () => {
      expect(isManagerOrAdmin(mockAdvisorUser)).toBe(false);
    });

    it('debería retornar false para usuario null', () => {
      expect(isManagerOrAdmin(null)).toBe(false);
    });
  });
});
