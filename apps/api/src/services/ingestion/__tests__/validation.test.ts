import { validateSchema, normalizeData, extractMonthFromFileName } from '../validation';

describe('Validation Service', () => {
  describe('validateSchema', () => {
    it('should validate correct data', () => {
      const validData = [
        {
          idcuenta: '12345',
          comitente: 1001,
          cuotapartista: 1,
          descripcion: 'Cliente Test',
          asesor: 'Juan Pérez'
        },
        {
          idcuenta: '12346',
          comitente: 1002,
          cuotapartista: 1,
          descripcion: 'Cliente Test 2'
          // asesor is optional
        }
      ];

      const result = validateSchema(validData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);
    });

    it('should detect missing required columns', () => {
      const invalidData = [
        {
          comitente: 1001,
          cuotapartista: 1,
          descripcion: 'Cliente Test'
          // missing idcuenta
        }
      ];

      const result = validateSchema(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('idcuenta');
    });

    it('should detect invalid data types', () => {
      const invalidData = [
        {
          idcuenta: '12345',
          comitente: 'invalid', // should be number
          cuotapartista: 1,
          descripcion: 'Cliente Test'
        }
      ];

      const result = validateSchema(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('comitente');
    });

    it('should detect duplicate ids', () => {
      const dataWithDuplicates = [
        {
          idcuenta: '12345',
          comitente: 1001,
          cuotapartista: 1,
          descripcion: 'Cliente 1'
        },
        {
          idcuenta: '12345', // duplicate
          comitente: 1002,
          cuotapartista: 1,
          descripcion: 'Cliente 2'
        }
      ];

      const result = validateSchema(dataWithDuplicates);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('duplicados');
    });
  });

  describe('normalizeData', () => {
    it('should normalize data correctly', () => {
      const rawData = [
        {
          idcuenta: ' 12345 ',
          comitente: '1001',
          cuotapartista: '1',
          descripcion: ' Cliente Test ',
          asesor: ' Juan Pérez '
        }
      ];

      const result = normalizeData(rawData);
      
      expect(result[0]).toEqual({
        idcuenta: '12345',
        comitente: 1001,
        cuotapartista: 1,
        descripcion: 'Cliente Test',
        asesor: 'Juan Pérez'
      });
    });

    it('should handle empty asesor', () => {
      const rawData = [
        {
          idcuenta: '12345',
          comitente: '1001',
          cuotapartista: '1',
          descripcion: 'Cliente Test',
          asesor: ''
        }
      ];

      const result = normalizeData(rawData);
      
      expect(result[0].asesor).toBeUndefined();
    });
  });

  describe('extractMonthFromFileName', () => {
    it('should extract month from filename with pattern YYYY-MM', () => {
      const fileName = 'reporteClusterCuentasV2_2025-01.xlsx';
      const month = extractMonthFromFileName(fileName);
      
      expect(month).toBe('2025-01');
    });

    it('should extract month from filename with pattern YYYY_MM', () => {
      const fileName = 'reporteClusterCuentasV2_2025_01.xlsx';
      const month = extractMonthFromFileName(fileName);
      
      expect(month).toBe('2025-01');
    });

    it('should use default month when pattern not found', () => {
      const fileName = 'reporteClusterCuentasV2.xlsx';
      const defaultMonth = '2025-02';
      const month = extractMonthFromFileName(fileName, defaultMonth);
      
      expect(month).toBe(defaultMonth);
    });

    it('should use current month when no pattern and no default', () => {
      const fileName = 'reporteClusterCuentasV2.xlsx';
      const month = extractMonthFromFileName(fileName);
      
      // Should be current year-month
      const now = new Date();
      const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(month).toBe(expectedMonth);
    });
  });
});



