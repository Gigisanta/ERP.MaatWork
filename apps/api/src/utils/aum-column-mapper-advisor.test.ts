/**
 * Tests para mapeo de columnas AUM - Casos específicos de advisorRaw
 *
 * AI_DECISION: Tests unitarios para validar mapeo cuando archivo no tiene columna Asesor
 * Justificación: Validación crítica de preservación de advisorRaw entre archivos
 * Impacto: Prevenir pérdida de datos de asesor al cargar archivos sin columna Asesor
 */

import { describe, it, expect } from 'vitest';
import { mapAumColumns } from './aum-columns';

describe('AUM Column Mapper - Advisor Raw', () => {
  describe('Archivo sin columna Asesor', () => {
    it('debería retornar advisorRaw null cuando no hay columna Asesor', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        cuenta: 'MARITANO FEDERICO NICOLAS',
        'AUM en Dolares': '100000',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.advisorRaw).toBeNull();
      expect(mapped.idCuenta).toBe('12345');
      expect(mapped.accountNumber).toBe('76551');
      expect(mapped.holderName).toBe('MARITANO FEDERICO NICOLAS');
    });

    it('debería retornar advisorRaw null cuando columna Asesor está vacía', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        cuenta: 'MARITANO FEDERICO NICOLAS',
        Asesor: '',
        'AUM en Dolares': '100000',
      };

      const mapped = mapAumColumns(record);

      // Cuando la columna existe pero está vacía, safeToString retorna null
      expect(mapped.advisorRaw).toBeNull();
    });

    it('debería retornar advisorRaw null cuando columna Asesor tiene solo espacios', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        cuenta: 'MARITANO FEDERICO NICOLAS',
        Asesor: '   ',
        'AUM en Dolares': '100000',
      };

      const mapped = mapAumColumns(record);

      // safeToString con trim retorna null para strings vacíos
      expect(mapped.advisorRaw).toBeNull();
    });
  });

  describe('Archivo con columna Asesor', () => {
    it('debería mapear correctamente cuando hay columna Asesor', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        Descripcion: 'MARITANO FEDERICO NICOLAS',
        Asesor: 'Nicanor Zappia',
        'AUM en Dolares': '100000',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.advisorRaw).toBe('Nicanor Zappia');
      expect(mapped.idCuenta).toBe('12345');
      expect(mapped.accountNumber).toBe('76551');
      expect(mapped.holderName).toBe('MARITANO FEDERICO NICOLAS');
    });

    it('debería mapear correctamente con variaciones de nombre de columna', () => {
      const variations = [
        { Asesor: 'Nicanor Zappia' },
        { 'Asesor asignado': 'Nicanor Zappia' },
        { asesor_asignado: 'Nicanor Zappia' },
        { Advisor: 'Nicanor Zappia' },
        { 'advisor name': 'Nicanor Zappia' },
      ];

      for (const record of variations) {
        const fullRecord = {
          idCuenta: '12345',
          comitente: '76551',
          Descripcion: 'MARITANO FEDERICO NICOLAS',
          ...record,
        };

        const mapped = mapAumColumns(fullRecord);
        expect(mapped.advisorRaw).toBe('Nicanor Zappia');
      }
    });
  });

  describe('Mapeo de columnas con formato reporteClusterCuentasV2', () => {
    it('debería mapear correctamente archivo sin columna Asesor', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        cuenta: 'MARITANO FEDERICO NICOLAS',
        'AUM en Dolares': '100000',
        'Bolsa Arg': '50000',
        'Fondos Arg': '30000',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.advisorRaw).toBeNull();
      expect(mapped.idCuenta).toBe('12345');
      expect(mapped.accountNumber).toBe('76551');
      expect(mapped.holderName).toBe('MARITANO FEDERICO NICOLAS');
      expect(mapped.aumDollars).toBe(100000);
    });
  });

  describe('Mapeo de columnas con formato Balanz completo', () => {
    it('debería mapear correctamente archivo con columna Asesor', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        Descripcion: 'MARITANO FEDERICO NICOLAS',
        Asesor: 'Nicanor Zappia',
        'AUM en Dolares': '100000',
        'Bolsa Arg': '50000',
        'Fondos Arg': '30000',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.advisorRaw).toBe('Nicanor Zappia');
      expect(mapped.idCuenta).toBe('12345');
      expect(mapped.accountNumber).toBe('76551');
      expect(mapped.holderName).toBe('MARITANO FEDERICO NICOLAS');
      expect(mapped.aumDollars).toBe(100000);
    });
  });

  describe('Casos edge', () => {
    it('debería manejar null en columna Asesor', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        Descripcion: 'MARITANO FEDERICO NICOLAS',
        Asesor: null,
        'AUM en Dolares': '100000',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.advisorRaw).toBeNull();
    });

    it('debería manejar undefined en columna Asesor', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        Descripcion: 'MARITANO FEDERICO NICOLAS',
        Asesor: undefined,
        'AUM en Dolares': '100000',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.advisorRaw).toBeNull();
    });

    it('debería manejar número en columna Asesor (rechazado como error de mapeo)', () => {
      const record = {
        idCuenta: '12345',
        comitente: '76551',
        Descripcion: 'MARITANO FEDERICO NICOLAS',
        Asesor: 12345,
        'AUM en Dolares': '100000',
      };

      const mapped = mapAumColumns(record);

      // AI_DECISION: advisorRaw rechaza valores numéricos como error de mapeo
      // El código detecta que 12345 es numérico y lo asigna como null
      expect(mapped.advisorRaw).toBeNull();
    });
  });
});
