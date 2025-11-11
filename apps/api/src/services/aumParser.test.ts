/**
 * aumParser Service Tests
 * 
 * AI_DECISION: Tests de integración para parsing de archivos
 * Justificación: Verifica lógica crítica de parsing CSV/Excel
 * Impacto: Confianza en importación de datos
 */

import { describe, it, expect } from 'vitest';
import { parseAumFile, type ParsedAumRow } from './aumParser';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('aumParser', () => {
  describe('CSV parsing', () => {
    it('should parse valid CSV file with all columns', async () => {
      // Create temporary CSV file
      const csvContent = `Account Number,Holder Name,ID Cuenta,Advisor,AUM USD,Bolsa ARG
12345,Juan Perez,ABC123,juan@advisor.com,10000.50,5000.25`;
      
      const tmpFile = join(tmpdir(), `test-${Date.now()}.csv`);
      writeFileSync(tmpFile, csvContent);
      
      try {
        const result = await parseAumFile(tmpFile, 'test.csv');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toHaveLength(1);
          
          const row = result.value[0];
          expect(row.accountNumber).toBe('12345');
          expect(row.holderName).toBe('Juan Perez');
          expect(row.idCuenta).toBe('ABC123');
          expect(row.advisorRaw).toBe('juan@advisor.com');
          expect(row.aumDollars).toBe(10000.50);
          expect(row.bolsaArg).toBe(5000.25);
        }
      } finally {
        unlinkSync(tmpFile);
      }
    });

    it('should handle empty CSV file', async () => {
      const csvContent = `Account Number,Holder Name\n`;
      const tmpFile = join(tmpdir(), `test-empty-${Date.now()}.csv`);
      writeFileSync(tmpFile, csvContent);
      
      try {
        const result = await parseAumFile(tmpFile, 'empty.csv');
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('no contiene');
        }
      } finally {
        unlinkSync(tmpFile);
      }
    });

    it('should handle CSV with missing columns gracefully', async () => {
      const csvContent = `Account Number,Holder Name
12345,Maria Lopez`;
      const tmpFile = join(tmpdir(), `test-partial-${Date.now()}.csv`);
      writeFileSync(tmpFile, csvContent);
      
      try {
        const result = await parseAumFile(tmpFile, 'partial.csv');
        
        expect(result.success).toBe(true);
        if (result.success) {
          const row = result.value[0];
          expect(row.accountNumber).toBe('12345');
          expect(row.holderName).toBe('Maria Lopez');
          expect(row.aumDollars).toBeNull(); // Missing column
          expect(row.advisorRaw).toBeNull();
        }
      } finally {
        unlinkSync(tmpFile);
      }
    });
  });

  describe('Error handling', () => {
    it('should return error for unsupported file type', async () => {
      const result = await parseAumFile('/fake/path.txt', 'test.txt');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('no soportado');
      }
    });

    it('should return error for non-existent file', async () => {
      const result = await parseAumFile('/fake/nonexistent.csv', 'test.csv');
      
      expect(result.success).toBe(false);
    });
  });

  describe('Data normalization', () => {
    it('should normalize account numbers', async () => {
      const csvContent = `Account Number,Holder Name
"  12345  ",Juan Perez`;
      const tmpFile = join(tmpdir(), `test-normalize-${Date.now()}.csv`);
      writeFileSync(tmpFile, csvContent);
      
      try {
        const result = await parseAumFile(tmpFile, 'test.csv');
        
        expect(result.success).toBe(true);
        if (result.success) {
          // Account number should be trimmed and normalized
          expect(result.value[0].accountNumber).toBe('12345');
        }
      } finally {
        unlinkSync(tmpFile);
      }
    });
  });
});

