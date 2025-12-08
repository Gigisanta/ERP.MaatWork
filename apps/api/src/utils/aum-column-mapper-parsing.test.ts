/**
 * Tests para parsing y conversión numérica mejorada de AUM
 */

import { describe, it, expect } from 'vitest';
import { mapAumColumns, validateColumnMapping } from './aum-columns';

describe('aum-column-mapper parsing improvements', () => {
  describe('safeToNumber - formato europeo vs US', () => {
    // Los tests se hacen indirectamente a través de mapAumColumns

    it('debe convertir formato europeo correctamente (coma decimal, punto miles)', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '4.971,15',
        'Bolsa Arg': '2.089,69',
        pesos: '29.684,67',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBe(4971.15);
      expect(mapped.bolsaArg).toBe(2089.69);
      expect(mapped.pesos).toBe(29684.67);
    });

    it('debe convertir formato US correctamente (punto decimal, coma miles)', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '4,971.15',
        'Bolsa Arg': '2,089.69',
        pesos: '29684.67',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBe(4971.15);
      expect(mapped.bolsaArg).toBe(2089.69);
      expect(mapped.pesos).toBe(29684.67);
    });

    it('debe manejar valores con solo coma (formato europeo sin miles)', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '971,15',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBe(971.15);
    });

    it('debe manejar valores con solo punto (formato US sin miles)', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '971.15',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBe(971.15);
    });

    it('debe manejar números enteros sin decimales', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '4971',
        'Bolsa Arg': '2089',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBe(4971);
      expect(mapped.bolsaArg).toBe(2089);
    });
  });

  describe('safeToNumber - valores vacíos y especiales', () => {
    it('debe manejar valores vacíos como null', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '',
        'Bolsa Arg': null,
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBeNull();
      expect(mapped.bolsaArg).toBeNull();
    });

    it('debe manejar "--" como null', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '--',
        'Bolsa Arg': '--',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBeNull();
      expect(mapped.bolsaArg).toBeNull();
    });

    it('debe manejar "-" como null', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '-',
        'Bolsa Arg': '-',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBeNull();
      expect(mapped.bolsaArg).toBeNull();
    });

    it('debe manejar valores con espacios como null o parsear correctamente', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '   ',
        'Bolsa Arg': ' 4971.15 ',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.aumDollars).toBeNull();
      expect(mapped.bolsaArg).toBe(4971.15);
    });

    it('debe parsear valores cero como 0, no como null', () => {
      const record = {
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        'AUM en Dolares': '0',
        'Bolsa Arg': '0,00',
        'Fondos Arg': '0.00',
        'Bolsa BCI': '0,0',
        pesos: '0.0',
      };

      const mapped = mapAumColumns(record);

      // AI_DECISION: Los valores cero deben parsearse como 0, no null
      // Justificación: Los valores cero son datos válidos y deben distinguirse de valores ausentes
      // Impacto: Los valores cero se mostrarán como "0,00" en lugar de "--"
      expect(mapped.aumDollars).toBe(0);
      expect(mapped.bolsaArg).toBe(0);
      expect(mapped.fondosArg).toBe(0);
      expect(mapped.bolsaBci).toBe(0);
      expect(mapped.pesos).toBe(0);
    });
  });

  describe('validateColumnMapping - archivo master', () => {
    it('debe validar correctamente archivo master con todas las columnas', () => {
      const availableColumns = ['idCuenta', 'comitente', 'Descripcion', 'Asesor', 'AUM en Dolares'];
      const mapped = mapAumColumns({
        idCuenta: '123',
        comitente: '456',
        Descripcion: 'Test Client',
        Asesor: 'Test Advisor',
        'AUM en Dolares': '1000',
      });

      const validation = validateColumnMapping(availableColumns, mapped);

      expect(validation.fileType).toBe('master');
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.mappedColumns.idCuenta).toBe(true);
      expect(validation.mappedColumns.comitente).toBe(true);
      expect(validation.mappedColumns.holderName).toBe(true);
      expect(validation.mappedColumns.advisor).toBe(true);
    });

    it('debe generar error si falta Descripcion en archivo master', () => {
      const availableColumns = ['idCuenta', 'comitente', 'Asesor', 'AUM en Dolares'];
      const mapped = mapAumColumns({
        idCuenta: '123',
        comitente: '456',
        Asesor: 'Test Advisor',
        'AUM en Dolares': '1000',
      });

      const validation = validateColumnMapping(availableColumns, mapped);

      expect(validation.fileType).toBe('master');
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.includes('Descripcion'))).toBe(true);
    });
  });

  describe('validateColumnMapping - archivo monthly', () => {
    it('debe validar correctamente archivo monthly con todas las columnas', () => {
      const availableColumns = ['idCuenta', 'comitente', 'cuenta', 'AUM en Dolares'];
      const mapped = mapAumColumns({
        idCuenta: '123',
        comitente: '456',
        cuenta: 'Test Client',
        'AUM en Dolares': '1000',
      });

      const validation = validateColumnMapping(availableColumns, mapped);

      expect(validation.fileType).toBe('monthly');
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.mappedColumns.idCuenta).toBe(true);
      expect(validation.mappedColumns.comitente).toBe(true);
      expect(validation.mappedColumns.holderName).toBe(true);
      expect(validation.mappedColumns.advisor).toBe(false); // No requerido en monthly
    });

    it('debe generar error si falta cuenta en archivo monthly', () => {
      const availableColumns = ['idCuenta', 'comitente', 'AUM en Dolares'];
      const mapped = mapAumColumns({
        idCuenta: '123',
        comitente: '456',
        'AUM en Dolares': '1000',
      });

      const validation = validateColumnMapping(availableColumns, mapped);

      expect(validation.fileType).toBe('monthly');
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.includes('cuenta'))).toBe(true);
    });
  });

  describe('mapAumColumns - casos reales de archivos', () => {
    it('debe mapear correctamente fila de archivo master', () => {
      const record = {
        idCuenta: '15356',
        comitente: '76551',
        Descripcion: 'MARITANO FEDERICO NICOLAS',
        Asesor: 'Nicanor Zappia',
        'AUM en Dolares': '0',
        'Bolsa Arg': '',
        'Fondos Arg': '',
        'Bolsa BCI': '',
        pesos: '',
        mep: '',
        cable: '',
        cv7000: '',
        cv10000: '',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.idCuenta).toBe('15356');
      expect(mapped.accountNumber).toBe('76551');
      expect(mapped.holderName).toBe('MARITANO FEDERICO NICOLAS');
      expect(mapped.advisorRaw).toBe('Nicanor Zappia');
      expect(mapped.aumDollars).toBe(0);
    });

    it('debe mapear correctamente fila de archivo monthly', () => {
      const record = {
        idCuenta: '15356',
        comitente: '76551',
        cuenta: 'MARITANO FEDERICO NICOLAS',
        'AUM en Dolares': '0',
        'Bolsa Arg': '',
        'Fondos Arg': '',
        'Bolsa BCI': '',
        pesos: '',
        mep: '',
        cable: '',
        cv7000: '',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.idCuenta).toBe('15356');
      expect(mapped.accountNumber).toBe('76551');
      expect(mapped.holderName).toBe('MARITANO FEDERICO NICOLAS');
      expect(mapped.advisorRaw).toBeNull(); // No hay Asesor en monthly
      expect(mapped.aumDollars).toBe(0);
    });

    it('debe mapear correctamente valores con formato europeo del ejemplo del usuario', () => {
      const record = {
        idCuenta: '1492080',
        comitente: '',
        cuenta: 'PIZZI PAULA Y/O MILLAURO AGUSTIN',
        'AUM en Dolares': '551,76',
        'Bolsa Arg': '522,13',
        'Fondos Arg': '0,00',
        'Bolsa BCI': '0,00',
        pesos: '29.684,67',
        mep: '9,81',
        cable: '',
        cv7000: '',
      };

      const mapped = mapAumColumns(record);

      expect(mapped.idCuenta).toBe('1492080');
      expect(mapped.holderName).toBe('PIZZI PAULA Y/O MILLAURO AGUSTIN');
      expect(mapped.aumDollars).toBe(551.76);
      expect(mapped.bolsaArg).toBe(522.13);
      expect(mapped.fondosArg).toBe(0);
      expect(mapped.bolsaBci).toBe(0);
      expect(mapped.pesos).toBe(29684.67);
      expect(mapped.mep).toBe(9.81);
    });
  });
});
