/**
 * Tests para career-plan utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatAnnualGoal,
  formatProgressPercentage,
  formatIndex,
  formatLevelPercentage,
} from './career-plan';

describe('career-plan utilities', () => {
  describe('formatAnnualGoal', () => {
    it('debería formatear cantidad con separadores de miles', () => {
      expect(formatAnnualGoal(30000)).toBe('30.000 USD');
      expect(formatAnnualGoal(1000000)).toBe('1.000.000 USD');
      expect(formatAnnualGoal(500)).toBe('500 USD');
    });

    it('debería manejar cero', () => {
      expect(formatAnnualGoal(0)).toBe('0 USD');
    });

    it('debería manejar números negativos', () => {
      expect(formatAnnualGoal(-1000)).toBe('-1.000 USD');
    });
  });

  describe('formatProgressPercentage', () => {
    it('debería formatear porcentaje con decimales', () => {
      expect(formatProgressPercentage(75.5)).toBe('75.5%');
      expect(formatProgressPercentage(50.3)).toBe('50.3%');
    });

    it('debería formatear porcentaje entero sin decimales', () => {
      expect(formatProgressPercentage(75.0)).toBe('75%');
      expect(formatProgressPercentage(100)).toBe('100%');
    });

    it('debería redondear a 1 decimal', () => {
      expect(formatProgressPercentage(75.56)).toBe('75.6%');
      expect(formatProgressPercentage(75.54)).toBe('75.5%');
    });

    it('debería manejar cero', () => {
      expect(formatProgressPercentage(0)).toBe('0%');
    });

    it('debería manejar porcentajes mayores a 100', () => {
      expect(formatProgressPercentage(150.5)).toBe('150.5%');
    });
  });

  describe('formatIndex', () => {
    it('debería formatear índice como string', () => {
      expect(formatIndex('1.5')).toBe('1.5');
      expect(formatIndex('2')).toBe('2');
    });

    it('debería convertir número a string', () => {
      expect(formatIndex(1.5)).toBe('1.5');
      expect(formatIndex(2)).toBe('2');
    });

    it('debería manejar cero', () => {
      expect(formatIndex(0)).toBe('0');
      expect(formatIndex('0')).toBe('0');
    });
  });

  describe('formatLevelPercentage', () => {
    it('debería formatear porcentaje como string con %', () => {
      expect(formatLevelPercentage('37.5')).toBe('37.5%');
      expect(formatLevelPercentage('100')).toBe('100%');
    });

    it('debería formatear número como porcentaje', () => {
      expect(formatLevelPercentage(37.5)).toBe('37.5%');
      expect(formatLevelPercentage(100)).toBe('100%');
    });

    it('debería manejar valores inválidos', () => {
      expect(formatLevelPercentage('invalid')).toBe('invalid');
      expect(formatLevelPercentage('NaN')).toBe('NaN');
    });

    it('debería manejar cero', () => {
      expect(formatLevelPercentage(0)).toBe('0%');
      expect(formatLevelPercentage('0')).toBe('0%');
    });
  });
});
