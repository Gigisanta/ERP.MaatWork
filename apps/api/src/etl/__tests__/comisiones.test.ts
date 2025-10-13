/**
 * Tests unitarios para el parser de Comisiones
 * Cumple con DoD de STORY 3: "10 tests de consistencia monetaria/splits"
 */

import { describe, it, expect } from '@jest/globals';
import type { ComisionesRawRow } from '../types';
import {
  validateComisionesRow,
  parseComisiones,
  validateCommissionSplits,
  type ComisionesValidRow
} from '../parsers/comisiones';

describe('validateComisionesRow', () => {
  it('debe validar fila completa correctamente', () => {
    const raw: ComisionesRawRow = {
      FechaConcertacion: new Date('2024-01-15'),
      Comitente: 12345,
      Cuotapartista: 67890,
      Cuenta: 'CTA123',
      Tipo: 'Compra',
      Ticker: 'AAPL',
      ComisionDolarizada: 100.50,
      Porcentaje: 100,
      Asesor: 'Juan Perez'
    };
    
    const result = validateComisionesRow(raw, 1);
    
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.row.comisionDolarizada).toBe(100.50);
      expect(result.row.porcentaje).toBe(100);
      expect(result.row.asesorNorm).toBe('JUAN PEREZ');
    }
  });
  
  it('debe rechazar fila sin fecha', () => {
    const raw: ComisionesRawRow = {
      FechaConcertacion: null,
      Comitente: 12345,
      Cuotapartista: 67890,
      ComisionDolarizada: 100
    };
    
    const result = validateComisionesRow(raw, 1);
    
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('Fila 1: FechaConcertacion inválida o faltante');
    }
  });
  
  it('debe rechazar fila sin comitente', () => {
    const raw: ComisionesRawRow = {
      FechaConcertacion: new Date('2024-01-15'),
      Comitente: null,
      Cuotapartista: 67890,
      ComisionDolarizada: 100
    };
    
    const result = validateComisionesRow(raw, 2);
    
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('Fila 2: Comitente inválido o faltante');
    }
  });
  
  it('debe usar fallback para comisionDolarizada', () => {
    const raw: ComisionesRawRow = {
      FechaConcertacion: new Date('2024-01-15'),
      Comitente: 12345,
      Cuotapartista: 67890,
      ComisionDolarizada: null,
      ComisionPesificada: 10000,
      CotizacionDolar: 100,
      Porcentaje: 100
    };
    
    const result = validateComisionesRow(raw, 1);
    
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.row.comisionDolarizada).toBe(100); // 10000 / 100
    }
  });
  
  it('debe rechazar comisionDolarizada negativa', () => {
    const raw: ComisionesRawRow = {
      FechaConcertacion: new Date('2024-01-15'),
      Comitente: 12345,
      Cuotapartista: 67890,
      ComisionDolarizada: -100
    };
    
    const result = validateComisionesRow(raw, 3);
    
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('ComisionDolarizada inválida'))).toBe(true);
    }
  });
  
  it('debe asumir porcentaje 100 si es null', () => {
    const raw: ComisionesRawRow = {
      FechaConcertacion: new Date('2024-01-15'),
      Comitente: 12345,
      Cuotapartista: 67890,
      ComisionDolarizada: 100,
      Porcentaje: null
    };
    
    const result = validateComisionesRow(raw, 1);
    
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.row.porcentaje).toBe(100);
    }
  });
  
  it('debe rechazar porcentaje fuera de rango', () => {
    const raw: ComisionesRawRow = {
      FechaConcertacion: new Date('2024-01-15'),
      Comitente: 12345,
      Cuotapartista: 67890,
      ComisionDolarizada: 100,
      Porcentaje: 150
    };
    
    const result = validateComisionesRow(raw, 4);
    
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('Porcentaje fuera de rango'))).toBe(true);
    }
  });
});

describe('parseComisiones', () => {
  it('debe parsear múltiples filas correctamente', () => {
    const rawRows: ComisionesRawRow[] = [
      {
        FechaConcertacion: new Date('2024-01-15'),
        Comitente: 12345,
        Cuotapartista: 67890,
        ComisionDolarizada: 100,
        Porcentaje: 100
      },
      {
        FechaConcertacion: new Date('2024-01-16'),
        Comitente: 12346,
        Cuotapartista: 67891,
        ComisionDolarizada: 200,
        Porcentaje: 50
      }
    ];
    
    const result = parseComisiones(rawRows);
    
    expect(result.metrics.filasLeidas).toBe(2);
    expect(result.metrics.filasValidas).toBe(2);
    expect(result.metrics.filasRechazadas).toBe(0);
    expect(result.validRows).toHaveLength(2);
  });
  
  it('debe separar filas válidas de inválidas', () => {
    const rawRows: ComisionesRawRow[] = [
      {
        FechaConcertacion: new Date('2024-01-15'),
        Comitente: 12345,
        Cuotapartista: 67890,
        ComisionDolarizada: 100
      },
      {
        FechaConcertacion: null, // Inválida
        Comitente: 12346,
        Cuotapartista: 67891,
        ComisionDolarizada: 200
      },
      {
        FechaConcertacion: new Date('2024-01-17'),
        Comitente: 12347,
        Cuotapartista: 67892,
        ComisionDolarizada: 300
      }
    ];
    
    const result = parseComisiones(rawRows);
    
    expect(result.metrics.filasLeidas).toBe(3);
    expect(result.metrics.filasValidas).toBe(2);
    expect(result.metrics.filasRechazadas).toBe(1);
    expect(result.invalidRows).toHaveLength(1);
  });
});

describe('validateCommissionSplits', () => {
  it('debe validar split único al 100%', () => {
    const rows: ComisionesValidRow[] = [
      {
        fechaConcertacion: new Date('2024-01-15'),
        comitente: 12345,
        cuotapartista: 67890,
        cuenta: null,
        tipo: null,
        descripcion: null,
        ticker: 'AAPL',
        cantidad: null,
        precio: null,
        precioRef: null,
        ivaComision: null,
        comisionPesificada: null,
        cotizacionDolar: null,
        comisionDolarizada: 100,
        asesor: null,
        asesorNorm: '',
        cuilAsesor: null,
        equipo: null,
        unidadDeNegocio: null,
        productor: null,
        idPersonaAsesor: null,
        referidor: null,
        arancel: null,
        esquemaComisiones: null,
        fechaAlta: null,
        porcentaje: 100,
        cuitFacturacion: null,
        esJuridica: null,
        pais: null
      }
    ];
    
    expect(validateCommissionSplits(rows)).toBe(true);
  });
  
  it('debe validar split 50/50', () => {
    const rows: ComisionesValidRow[] = [
      {
        fechaConcertacion: new Date('2024-01-15'),
        comitente: 12345,
        cuotapartista: 67890,
        cuenta: null,
        tipo: null,
        descripcion: null,
        ticker: 'AAPL',
        cantidad: null,
        precio: null,
        precioRef: null,
        ivaComision: null,
        comisionPesificada: null,
        cotizacionDolar: null,
        comisionDolarizada: 100,
        asesor: null,
        asesorNorm: '',
        cuilAsesor: null,
        equipo: null,
        unidadDeNegocio: null,
        productor: null,
        idPersonaAsesor: 1,
        referidor: null,
        arancel: null,
        esquemaComisiones: null,
        fechaAlta: null,
        porcentaje: 50,
        cuitFacturacion: null,
        esJuridica: null,
        pais: null
      },
      {
        fechaConcertacion: new Date('2024-01-15'),
        comitente: 12345,
        cuotapartista: 67890,
        cuenta: null,
        tipo: null,
        descripcion: null,
        ticker: 'AAPL',
        cantidad: null,
        precio: null,
        precioRef: null,
        ivaComision: null,
        comisionPesificada: null,
        cotizacionDolar: null,
        comisionDolarizada: 100,
        asesor: null,
        asesorNorm: '',
        cuilAsesor: null,
        equipo: null,
        unidadDeNegocio: null,
        productor: null,
        idPersonaAsesor: 2,
        referidor: null,
        arancel: null,
        esquemaComisiones: null,
        fechaAlta: null,
        porcentaje: 50,
        cuitFacturacion: null,
        esJuridica: null,
        pais: null
      }
    ];
    
    // La suma de allocaciones debe ser: (100 * 0.50) + (100 * 0.50) = 100
    expect(validateCommissionSplits(rows)).toBe(true);
  });
  
  it('debe rechazar splits que no suman 100% (fuera de tolerancia)', () => {
    const rows: ComisionesValidRow[] = [
      {
        fechaConcertacion: new Date('2024-01-15'),
        comitente: 12345,
        cuotapartista: 67890,
        cuenta: null,
        tipo: null,
        descripcion: null,
        ticker: 'AAPL',
        cantidad: null,
        precio: null,
        precioRef: null,
        ivaComision: null,
        comisionPesificada: null,
        cotizacionDolar: null,
        comisionDolarizada: 100,
        asesor: null,
        asesorNorm: '',
        cuilAsesor: null,
        equipo: null,
        unidadDeNegocio: null,
        productor: null,
        idPersonaAsesor: 1,
        referidor: null,
        arancel: null,
        esquemaComisiones: null,
        fechaAlta: null,
        porcentaje: 60,
        cuitFacturacion: null,
        esJuridica: null,
        pais: null
      },
      {
        fechaConcertacion: new Date('2024-01-15'),
        comitente: 12345,
        cuotapartista: 67890,
        cuenta: null,
        tipo: null,
        descripcion: null,
        ticker: 'AAPL',
        cantidad: null,
        precio: null,
        precioRef: null,
        ivaComision: null,
        comisionPesificada: null,
        cotizacionDolar: null,
        comisionDolarizada: 100,
        asesor: null,
        asesorNorm: '',
        cuilAsesor: null,
        equipo: null,
        unidadDeNegocio: null,
        productor: null,
        idPersonaAsesor: 2,
        referidor: null,
        arancel: null,
        esquemaComisiones: null,
        fechaAlta: null,
        porcentaje: 50, // 60 + 50 = 110% > 100%
        cuitFacturacion: null,
        esJuridica: null,
        pais: null
      }
    ];
    
    // La suma de allocaciones: (100 * 0.60) + (100 * 0.50) = 110 ≠ 100
    expect(validateCommissionSplits(rows)).toBe(false);
  });
});




