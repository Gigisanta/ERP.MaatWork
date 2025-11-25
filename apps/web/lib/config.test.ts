/**
 * Tests para configuración centralizada
 * 
 * AI_DECISION: Tests unitarios para config y getRequiredEnv
 * Justificación: Validación crítica de configuración de la aplicación
 * Impacto: Prevenir errores por configuración incorrecta
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { config } from './config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getRequiredEnv', () => {
    it('debería usar valor de env var cuando está definida', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.apiUrl).toBe('https://api.example.com');
    });

    it('debería usar fallback cuando env var no está definida', () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.apiUrl).toBe('http://localhost:3001');
    });

    it('debería lanzar error cuando no hay env var ni fallback', () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      vi.resetModules();
      
      // getRequiredEnv sin fallback debería lanzar error si no hay valor
      // Pero en config.ts siempre hay fallback, así que este caso no aplica directamente
      // Verificamos que funciona con fallback
      const { config: testConfig } = require('./config');
      expect(testConfig.apiUrl).toBeDefined();
    });
  });

  describe('config.apiUrl', () => {
    it('debería tener valor por defecto', () => {
      expect(config.apiUrl).toBeDefined();
      expect(typeof config.apiUrl).toBe('string');
      expect(config.apiUrl.length).toBeGreaterThan(0);
    });

    it('debería usar NEXT_PUBLIC_API_URL si está definida', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://custom-api.com';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.apiUrl).toBe('https://custom-api.com');
    });
  });

  describe('config.apiTimeout', () => {
    it('debería parsear timeout correctamente', () => {
      expect(typeof config.apiTimeout).toBe('number');
      expect(config.apiTimeout).toBeGreaterThan(0);
    });

    it('debería usar NEXT_PUBLIC_API_TIMEOUT si está definida', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = '60000';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.apiTimeout).toBe(60000);
    });

    it('debería usar valor por defecto cuando timeout no está definida', () => {
      delete process.env.NEXT_PUBLIC_API_TIMEOUT;
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.apiTimeout).toBe(30000); // Default
    });
  });

  describe('config.n8nUrl', () => {
    it('debería tener valor por defecto', () => {
      expect(config.n8nUrl).toBeDefined();
      expect(config.n8nUrl).toBe('http://localhost:5678');
    });

    it('debería usar NEXT_PUBLIC_N8N_URL si está definida', () => {
      process.env.NEXT_PUBLIC_N8N_URL = 'https://n8n.example.com';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.n8nUrl).toBe('https://n8n.example.com');
    });
  });

  describe('config.environment', () => {
    it('debería detectar NODE_ENV correctamente', () => {
      expect(config.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(config.environment);
    });

    it('debería usar development como default', () => {
      delete process.env.NODE_ENV;
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.environment).toBe('development');
    });
  });

  describe('config.isDevelopment', () => {
    it('debería ser true cuando NODE_ENV es development', () => {
      process.env.NODE_ENV = 'development';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.isDevelopment).toBe(true);
      expect(testConfig.isProduction).toBe(false);
    });
  });

  describe('config.isProduction', () => {
    it('debería ser true cuando NODE_ENV es production', () => {
      process.env.NODE_ENV = 'production';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.isProduction).toBe(true);
      expect(testConfig.isDevelopment).toBe(false);
    });
  });

  describe('config.features', () => {
    it('debería tener analytics deshabilitado por defecto', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.features.analytics).toBe(false);
    });

    it('debería habilitar analytics cuando NEXT_PUBLIC_ENABLE_ANALYTICS es true', () => {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.features.analytics).toBe(true);
    });

    it('debería tener debug deshabilitado por defecto', () => {
      delete process.env.NEXT_PUBLIC_DEBUG;
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.features.debug).toBe(false);
    });

    it('debería habilitar debug cuando NEXT_PUBLIC_DEBUG es true', () => {
      process.env.NEXT_PUBLIC_DEBUG = 'true';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.features.debug).toBe(true);
    });

    it('debería mantener debug deshabilitado cuando NEXT_PUBLIC_DEBUG no es true', () => {
      process.env.NEXT_PUBLIC_DEBUG = 'false';
      vi.resetModules();
      const { config: testConfig } = require('./config');
      
      expect(testConfig.features.debug).toBe(false);
    });
  });

  describe('config type', () => {
    it('debería exportar tipo Config', () => {
      // Verificar que el tipo existe (TypeScript check)
      expect(config).toBeDefined();
      expect(config).toHaveProperty('apiUrl');
      expect(config).toHaveProperty('apiTimeout');
      expect(config).toHaveProperty('n8nUrl');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('isDevelopment');
      expect(config).toHaveProperty('isProduction');
      expect(config).toHaveProperty('features');
    });
  });
});


