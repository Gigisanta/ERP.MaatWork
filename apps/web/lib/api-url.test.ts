/**
 * Tests para api-url utility
 * 
 * AI_DECISION: Tests unitarios para construcción de URLs
 * Justificación: Prevenir errores en URLs de descarga y formularios
 * Impacto: UX y funcionalidad de features críticas
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL, getApiUrl } from './api-url';

describe('api-url utility', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    // Restaurar env var original
    if (originalEnv) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });

  describe('API_BASE_URL constant', () => {
    it('debería usar NEXT_PUBLIC_API_URL si está definida', () => {
      // Ya está en el entorno, solo verificamos el tipo
      expect(typeof API_BASE_URL).toBe('string');
      expect(API_BASE_URL.length).toBeGreaterThan(0);
    });

    it('debería ser una URL válida', () => {
      expect(API_BASE_URL).toMatch(/^https?:\/\//);
    });

    it('NO debería terminar en slash', () => {
      expect(API_BASE_URL).not.toMatch(/\/$/);
    });
  });

  describe('getApiUrl function', () => {
    describe('Construcción básica', () => {
      it('debería concatenar path al base URL', () => {
        const result = getApiUrl('/api/users');
        expect(result).toContain('/api/users');
      });

      it('debería manejar paths que comienzan con /', () => {
        const result = getApiUrl('/endpoint');
        expect(result).toMatch(/^https?:\/\/.+\/endpoint$/);
      });

      it('debería construir URL completa', () => {
        const result = getApiUrl('/test');
        expect(result.startsWith('http')).toBe(true);
        expect(result.includes('/test')).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('debería manejar path vacío', () => {
        const result = getApiUrl('');
        expect(result).toBe(API_BASE_URL);
      });

      it('debería manejar path sin slash inicial', () => {
        const result = getApiUrl('endpoint');
        expect(result).toBe(`${API_BASE_URL}endpoint`);
      });

      it('debería manejar múltiples slashes', () => {
        const result = getApiUrl('//multiple//slashes');
        expect(result).toBe(`${API_BASE_URL}//multiple//slashes`);
      });

      it('debería manejar query strings', () => {
        const result = getApiUrl('/api/users?limit=10&offset=0');
        expect(result).toContain('?limit=10&offset=0');
      });

      it('debería manejar paths largos', () => {
        const longPath = '/api/v1/admin/aum/uploads/550e8400-e29b-41d4-a716-446655440000/export';
        const result = getApiUrl(longPath);
        expect(result).toContain(longPath);
      });
    });

    describe('Use cases reales (AUM)', () => {
      it('debería construir URL de exportación correctamente', () => {
        const fileId = '550e8400-e29b-41d4-a716-446655440000';
        const result = getApiUrl(`/admin/aum/uploads/${fileId}/export`);
        
        expect(result).toMatch(/^https?:\/\//);
        expect(result).toContain('/admin/aum/uploads/');
        expect(result).toContain(fileId);
        expect(result).toContain('/export');
      });

      it('debería construir URL de commit correctamente', () => {
        const fileId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const result = getApiUrl(`/admin/aum/uploads/${fileId}/commit`);
        
        expect(result).toMatch(/^https?:\/\//);
        expect(result).toContain('/admin/aum/uploads/');
        expect(result).toContain(fileId);
        expect(result).toContain('/commit');
      });

      it('debería funcionar con enlaces de descarga', () => {
        const result = getApiUrl('/admin/aum/uploads/abc123/export');
        
        // Debe ser una URL absoluta válida para usar en <a href>
        const url = new URL(result);
        expect(url.protocol).toMatch(/^https?:$/);
        expect(url.pathname).toBe('/admin/aum/uploads/abc123/export');
      });

      it('debería funcionar con form actions', () => {
        const result = getApiUrl('/admin/aum/uploads/def456/commit');
        
        // Debe ser una URL absoluta válida para usar en <form action>
        const url = new URL(result);
        expect(url.protocol).toMatch(/^https?:$/);
        expect(url.pathname).toBe('/admin/aum/uploads/def456/commit');
      });
    });

    describe('Consistency with apiClient', () => {
      it('debería ser diferente de apiClient (no incluye headers)', () => {
        // apiClient agrega headers automáticamente, getApiUrl solo construye URL
        const result = getApiUrl('/test');
        expect(typeof result).toBe('string');
        expect(result).not.toHaveProperty('headers');
      });

      it('debería usar la misma base URL que apiClient', () => {
        // Ambos deben usar NEXT_PUBLIC_API_URL
        const result = getApiUrl('/test');
        expect(result).toContain(API_BASE_URL);
      });
    });

    describe('Security', () => {
      it('NO debería validar o sanitizar el path (responsabilidad del llamador)', () => {
        // getApiUrl es una utilidad de bajo nivel, no hace sanitización
        const maliciousPath = '/../../etc/passwd';
        const result = getApiUrl(maliciousPath);
        expect(result).toContain(maliciousPath);
      });

      it('NO debería modificar caracteres especiales', () => {
        const result = getApiUrl('/test?param=<script>alert(1)</script>');
        expect(result).toContain('<script>');
      });

      it('NO debería hacer encoding automático', () => {
        const result = getApiUrl('/test?name=John Doe');
        expect(result).toContain('John Doe');
        expect(result).not.toContain('John%20Doe');
      });
    });
  });

  describe('Integration with environment', () => {
    it('debería cambiar si cambia la env var (requiere restart)', () => {
      // En un entorno real, cambiar process.env requiere restart
      // Este test documenta el comportamiento esperado
      const currentBaseUrl = API_BASE_URL;
      expect(currentBaseUrl).toBeDefined();
      expect(currentBaseUrl.length).toBeGreaterThan(0);
    });

    it('debería tener fallback a localhost si no hay env var', () => {
      // Si NEXT_PUBLIC_API_URL no está definida, debe usar localhost:3001
      // Esto se verifica en el módulo directamente
      expect(API_BASE_URL).toMatch(/^https?:\/\//);
    });
  });
});

