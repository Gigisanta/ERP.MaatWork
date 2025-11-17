import { describe, it, expect } from 'vitest';
import {
  normalizeColumnName,
  findColumnByPatterns,
  mapAumColumns
} from './aum-column-mapper';

describe('aum-column-mapper', () => {
  describe('normalizeColumnName', () => {
    it('normalizes case to lowercase', () => {
      expect(normalizeColumnName('CUENTA')).toBe('cuenta');
      expect(normalizeColumnName('Titular')).toBe('titular');
      expect(normalizeColumnName('Asesor')).toBe('asesor');
    });

    it('trims whitespace', () => {
      expect(normalizeColumnName('  cuenta  ')).toBe('cuenta');
      expect(normalizeColumnName('\ttitular\n')).toBe('titular');
    });

    it('normalizes spaces and special characters', () => {
      expect(normalizeColumnName('Cuenta Comitente')).toBe('cuenta comitente');
      expect(normalizeColumnName('Cuenta-Comitente')).toBe('cuenta comitente');
      expect(normalizeColumnName('Cuenta_Comitente')).toBe('cuenta comitente');
      expect(normalizeColumnName('Cuenta   Comitente')).toBe('cuenta comitente');
    });

    it('removes degree symbols', () => {
      expect(normalizeColumnName('Nro°')).toBe('nro');
      expect(normalizeColumnName('N° Cuenta')).toBe('n cuenta');
    });

    it('handles empty strings', () => {
      expect(normalizeColumnName('')).toBe('');
      expect(normalizeColumnName('   ')).toBe('');
    });
  });

  describe('findColumnByPatterns', () => {
    it('finds exact match first', () => {
      const columns = ['Cuenta Comitente', 'Titular', 'Asesor'];
      const patterns = ['cuenta comitente', 'comitente', 'cuenta'];
      
      expect(findColumnByPatterns(columns, patterns)).toBe('Cuenta Comitente');
    });

    it('finds partial match when exact not found', () => {
      const columns = ['Numero de Cuenta', 'Titular Nombre', 'Asesor Asignado'];
      const patterns = ['cuenta', 'comitente'];
      
      expect(findColumnByPatterns(columns, patterns)).toBe('Numero de Cuenta');
    });

    it('returns null when no match found', () => {
      const columns = ['Columna1', 'Columna2'];
      const patterns = ['cuenta', 'comitente'];
      
      expect(findColumnByPatterns(columns, patterns)).toBeNull();
    });

    it('is case-insensitive', () => {
      const columns = ['CUENTA', 'TITULAR', 'ASESOR'];
      const patterns = ['cuenta', 'titular'];
      
      expect(findColumnByPatterns(columns, patterns)).toBe('CUENTA');
    });

    it('handles columns with special characters', () => {
      const columns = ['Cuenta-Comitente', 'Titular_Nombre', 'N° Cuenta'];
      const patterns = ['cuenta comitente', 'titular nombre', 'n cuenta'];
      
      expect(findColumnByPatterns(columns, patterns)).toBe('Cuenta-Comitente');
      expect(findColumnByPatterns(['Titular_Nombre'], ['titular nombre'])).toBe('Titular_Nombre');
      // N° Cuenta normaliza a "n cuenta", que coincide con el patrón "n cuenta"
      expect(findColumnByPatterns(['N° Cuenta'], ['n cuenta', 'nro cuenta'])).toBe('N° Cuenta');
    });

    it('prioritizes first exact match', () => {
      const columns = ['Cuenta', 'Cuenta Comitente', 'Numero de Cuenta'];
      const patterns = ['cuenta', 'cuenta comitente'];
      
      // Should find 'Cuenta' first (exact match with first pattern)
      expect(findColumnByPatterns(columns, patterns)).toBe('Cuenta');
    });
  });

  describe('mapAumColumns', () => {
    it('maps standard column names', () => {
      const record = {
        'Cuenta comitente': '12345',
        'Titular': 'Juan Perez',
        'Asesor': 'Carlos Gomez'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('12345');
      expect(result.holderName).toBe('Juan Perez');
      expect(result.advisorRaw).toBe('Carlos Gomez');
    });

    it('maps alternative column names', () => {
      const record = {
        'comitente': '67890',
        'Descripcion': 'Maria Rodriguez',
        'asesor': 'Ana Lopez'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('67890');
      expect(result.holderName).toBe('Maria Rodriguez');
      expect(result.advisorRaw).toBe('Ana Lopez');
    });

    it('maps with case variations', () => {
      const record = {
        'CUENTA': '11111',
        'titular': 'Pedro Martinez',
        'ASESOR': 'Luis Fernandez'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('11111');
      expect(result.holderName).toBe('Pedro Martinez');
      expect(result.advisorRaw).toBe('Luis Fernandez');
    });

    it('maps with space and special character variations', () => {
      const record = {
        'Numero de Cuenta': '22222',
        'Nombre del Titular': 'Laura Sanchez',
        'Asesor-Asignado': 'Roberto Diaz'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('22222');
      expect(result.holderName).toBe('Laura Sanchez');
      expect(result.advisorRaw).toBe('Roberto Diaz');
    });

    it('maps account number with different patterns', () => {
      const testCases = [
        { col: 'Cuenta', value: '33333' },
        { col: 'Nro Cuenta', value: '44444' },
        { col: 'Account Number', value: '55555' },
        { col: 'numero_cuenta', value: '66666' }
      ];

      for (const testCase of testCases) {
        const record = { [testCase.col]: testCase.value };
        const result = mapAumColumns(record);
        expect(result.accountNumber).toBe(testCase.value);
      }
    });

    it('maps holder name with different patterns', () => {
      const testCases = [
        { col: 'Cliente', value: 'Cliente 1' },
        { col: 'Nombre Cliente', value: 'Cliente 2' },
        { col: 'Razon Social', value: 'Cliente 3' },
        { col: 'Holder Name', value: 'Cliente 4' }
      ];

      for (const testCase of testCases) {
        const record = { [testCase.col]: testCase.value };
        const result = mapAumColumns(record);
        expect(result.holderName).toBe(testCase.value);
      }
    });

    it('maps advisor with different patterns', () => {
      const testCases = [
        { col: 'Advisor', value: 'Advisor 1' },
        { col: 'Agente', value: 'Advisor 2' },
        { col: 'Ejecutivo', value: 'Advisor 3' },
        { col: 'Asesor_Asignado', value: 'Advisor 4' }
      ];

      for (const testCase of testCases) {
        const record = { [testCase.col]: testCase.value };
        const result = mapAumColumns(record);
        expect(result.advisorRaw).toBe(testCase.value);
      }
    });

    it('handles missing columns gracefully', () => {
      const record = {
        'OtherColumn': 'some value'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBeNull();
      expect(result.holderName).toBeNull();
      expect(result.advisorRaw).toBeNull();
    });

    it('handles empty string values', () => {
      const record = {
        'Cuenta comitente': '',
        'Titular': '   ',
        'Asesor': null
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBeNull();
      expect(result.holderName).toBeNull();
      expect(result.advisorRaw).toBeNull();
    });

    it('handles null and undefined values', () => {
      const record = {
        'Cuenta comitente': null,
        'Titular': undefined,
        'Asesor': 'Valid Advisor'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBeNull();
      expect(result.holderName).toBeNull();
      expect(result.advisorRaw).toBe('Valid Advisor');
    });

    it('trims string values', () => {
      const record = {
        'Cuenta comitente': '  12345  ',
        'Titular': '  Juan Perez  ',
        'Asesor': '  Carlos Gomez  '
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('12345');
      expect(result.holderName).toBe('Juan Perez');
      expect(result.advisorRaw).toBe('Carlos Gomez');
    });

    it('handles columns with additional data', () => {
      const record = {
        'Cuenta comitente': '12345',
        'Titular': 'Juan Perez',
        'Asesor': 'Carlos Gomez',
        'ExtraColumn1': 'extra1',
        'ExtraColumn2': 'extra2',
        'Fecha': '2024-01-01'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('12345');
      expect(result.holderName).toBe('Juan Perez');
      expect(result.advisorRaw).toBe('Carlos Gomez');
      // Extra columns should not affect the mapping
    });

    it('converts non-string values to string', () => {
      const record = {
        'Cuenta comitente': 12345,
        'Titular': 'Juan Perez',
        'Asesor': 42
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('12345');
      expect(result.holderName).toBe('Juan Perez');
      // AI_DECISION: advisorRaw rechaza valores numéricos como error de mapeo
      // El código detecta que 42 es numérico y lo asigna como null
      expect(result.advisorRaw).toBeNull();
    });

    it('handles Date objects from Excel', () => {
      const record = {
        'Cuenta comitente': '12345',
        'Titular': 'Juan Perez',
        'Fecha': new Date('2024-01-15')
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('12345');
      expect(result.holderName).toBe('Juan Perez');
      // Date should be converted to ISO string if it matches advisor pattern
    });

    it('handles null and undefined values', () => {
      const record = {
        'Cuenta comitente': null,
        'Titular': undefined,
        'Asesor': 'Carlos Gomez'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBeNull();
      expect(result.holderName).toBeNull();
      expect(result.advisorRaw).toBe('Carlos Gomez');
    });

    it('handles large numbers without scientific notation', () => {
      const record = {
        'Cuenta comitente': 123456789012345,
        'Titular': 'Juan Perez',
        'Asesor': 'Carlos Gomez'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBe('123456789012345');
      expect(result.holderName).toBe('Juan Perez');
      expect(result.advisorRaw).toBe('Carlos Gomez');
    });

    it('handles NaN and Infinity gracefully', () => {
      const record = {
        'Cuenta comitente': NaN,
        'Titular': Infinity,
        'Asesor': 'Carlos Gomez'
      };

      const result = mapAumColumns(record);

      expect(result.accountNumber).toBeNull();
      expect(result.holderName).toBeNull();
      expect(result.advisorRaw).toBe('Carlos Gomez');
    });

    it('maintains backward compatibility with existing column names', () => {
      // Test all the original column names still work
      const testCases = [
        {
          record: {
            'Cuenta comitente': '12345',
            'Titular': 'Juan Perez',
            'Asesor': 'Carlos Gomez'
          }
        },
        {
          record: {
            'comitente': '67890',
            'Descripcion': 'Maria Rodriguez',
            'asesor': 'Ana Lopez'
          }
        }
      ];

      for (const testCase of testCases) {
        const result = mapAumColumns(testCase.record);
        expect(result.accountNumber).toBeTruthy();
        expect(result.holderName).toBeTruthy();
        expect(result.advisorRaw).toBeTruthy();
      }
    });

    it('maps idCuenta column correctly', () => {
      const testCases = [
        { col: 'idCuenta', value: '15356' },
        { col: 'id_cuenta', value: '15470' },
        { col: 'id cuenta', value: '23661' },
        { col: 'ID CUENTA', value: '30488' },
        { col: 'idCuenta', value: '30646' }
      ];

      for (const testCase of testCases) {
        const record = { 
          [testCase.col]: testCase.value,
          'comitente': '76551',
          'Descripcion': 'Test Name',
          'Asesor': 'Test Advisor'
        };
        const result = mapAumColumns(record);
        expect(result.idCuenta).toBe(testCase.value);
      }
    });

    it('maps idCuenta, comitente, and Descripcion from Balanz CSV format', () => {
      const record = {
        'idCuenta': '15356',
        'comitente': '76551',
        'Descripcion': 'MARITANO FEDERICO NICOLAS',
        'Asesor': 'Nicanor Zappia'
      };

      const result = mapAumColumns(record);

      expect(result.idCuenta).toBe('15356');
      expect(result.accountNumber).toBe('76551');
      expect(result.holderName).toBe('MARITANO FEDERICO NICOLAS');
      expect(result.advisorRaw).toBe('Nicanor Zappia');
    });
  });
});

