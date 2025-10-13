/**
 * Parser para el reporte "Comisiones" (Excel)
 * Implementa STORY 3 - KAN-124
 */

import type {
  ComisionesRawRow,
  IngestaMetrics,
  ParserConfig
} from '../types';
import {
  normalizeAsesor,
  castToInt,
  castToBoolean,
  castToDate,
  castToNumber
} from '../normalization';

/**
 * Row validado y tipado del Excel "Comisiones"
 */
export interface ComisionesValidRow {
  fechaConcertacion: Date; // NOT NULL
  comitente: number; // NOT NULL
  cuotapartista: number; // NOT NULL
  cuenta: string | null;
  tipo: string | null;
  descripcion: string | null;
  ticker: string | null;
  cantidad: number | null;
  precio: number | null;
  precioRef: number | null;
  ivaComision: number | null;
  comisionPesificada: number | null;
  cotizacionDolar: number | null;
  comisionDolarizada: number; // NOT NULL (fuente de verdad)
  asesor: string | null;
  asesorNorm: string;
  cuilAsesor: string | null;
  equipo: string | null;
  unidadDeNegocio: string | null;
  productor: string | null;
  idPersonaAsesor: number | null; // Source of truth para dim_advisor
  referidor: string | null;
  arancel: string | null;
  esquemaComisiones: string | null;
  fechaAlta: Date | null;
  porcentaje: number; // Default: 100 si null
  cuitFacturacion: string | null;
  esJuridica: boolean | null;
  pais: string | null;
}

/**
 * Resultado del proceso de parsing y validación
 */
export interface ParseComisionesResult {
  validRows: ComisionesValidRow[];
  invalidRows: Array<{ row: number; errors: string[] }>;
  metrics: IngestaMetrics;
}

/**
 * Calcula comisionDolarizada con fallback
 * Regla (STORY 3): Si ComisionDolarizada es null → ComisionPesificada / CotizacionDolar
 * 
 * @param comisionDolarizada - Valor directo
 * @param comisionPesificada - Fallback numerador
 * @param cotizacionDolar - Fallback denominador
 * @returns Comisión en USD
 */
function calcularComisionUsd(
  comisionDolarizada: number | null,
  comisionPesificada: number | null,
  cotizacionDolar: number | null
): number | null {
  if (comisionDolarizada !== null && comisionDolarizada >= 0) {
    return comisionDolarizada;
  }
  
  if (comisionPesificada !== null && cotizacionDolar !== null && cotizacionDolar > 0) {
    return comisionPesificada / cotizacionDolar;
  }
  
  return null;
}

/**
 * Valida y transforma una fila raw del Excel Comisiones
 * 
 * @param raw - Fila raw del Excel
 * @param rowNumber - Número de fila (para logging)
 * @returns Row validado o array de errores
 */
export function validateComisionesRow(
  raw: ComisionesRawRow,
  rowNumber: number
): { valid: true; row: ComisionesValidRow } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar campos obligatorios
  const fechaConcertacion = castToDate(raw.FechaConcertacion);
  if (!fechaConcertacion) {
    errors.push(`Fila ${rowNumber}: FechaConcertacion inválida o faltante`);
  }
  
  const comitente = castToInt(raw.Comitente);
  if (comitente === null) {
    errors.push(`Fila ${rowNumber}: Comitente inválido o faltante`);
  }
  
  const cuotapartista = castToInt(raw.Cuotapartista);
  if (cuotapartista === null) {
    errors.push(`Fila ${rowNumber}: Cuotapartista inválido o faltante`);
  }
  
  // Calcular comisionDolarizada con fallback
  const comisionDolarizada = calcularComisionUsd(
    castToNumber(raw.ComisionDolarizada, 6),
    castToNumber(raw.ComisionPesificada, 6),
    castToNumber(raw.CotizacionDolar, 6)
  );
  
  if (comisionDolarizada === null || comisionDolarizada < 0) {
    errors.push(
      `Fila ${rowNumber}: ComisionDolarizada inválida (y sin fallback válido)`
    );
  } else if (comisionDolarizada === 0) {
    // Warning pero no bloquea si la comisión es 0
    warnings.push(`Fila ${rowNumber}: Comisión es 0 - verificar si es correcto`);
  }
  
  // Si hay errores críticos, retornar early
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Procesar porcentaje (default 100 si null)
  let porcentaje = castToNumber(raw.Porcentaje, 4);
  if (porcentaje === null) {
    porcentaje = 100;
    warnings.push(`Fila ${rowNumber}: Porcentaje null, asumiendo 100%`);
  }
  
  // Validar rango de porcentaje
  if (porcentaje < 0 || porcentaje > 100) {
    errors.push(
      `Fila ${rowNumber}: Porcentaje fuera de rango (0-100): ${porcentaje}`
    );
  }
  
  // Validar consistencia monetaria (warning, no bloquea)
  const comisionPesificada = castToNumber(raw.ComisionPesificada, 6);
  const cotizacionDolar = castToNumber(raw.CotizacionDolar, 6);
  if (
    comisionPesificada !== null &&
    cotizacionDolar !== null &&
    cotizacionDolar > 0 &&
    comisionDolarizada
  ) {
    const calculada = comisionPesificada / cotizacionDolar;
    const diff = Math.abs(calculada - comisionDolarizada);
    const diffPct = (diff / comisionDolarizada) * 100;
    
    if (diffPct > 1) {
      // Warning si diferencia > 1%
      warnings.push(
        `Fila ${rowNumber}: Diferencia entre ComisionDolarizada directa (${comisionDolarizada.toFixed(2)}) y calculada (${calculada.toFixed(2)}) > 1%`
      );
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Normalizar asesor
  const asesorNorm = normalizeAsesor(raw.Asesor);
  
  const validRow: ComisionesValidRow = {
    fechaConcertacion: fechaConcertacion!,
    comitente: comitente!,
    cuotapartista: cuotapartista!,
    cuenta: raw.Cuenta?.toString() || null,
    tipo: raw.Tipo?.toString() || null,
    descripcion: raw.Descripcion?.toString() || null,
    ticker: raw.Ticker?.toString() || null,
    cantidad: castToNumber(raw.Cantidad, 8),
    precio: castToNumber(raw.Precio, 6),
    precioRef: castToNumber(raw.PrecioRef, 6),
    ivaComision: castToNumber(raw.IVAComision, 6),
    comisionPesificada,
    cotizacionDolar,
    comisionDolarizada: comisionDolarizada!,
    asesor: raw.Asesor?.toString() || null,
    asesorNorm,
    cuilAsesor: raw.CUILAsesor?.toString() || null,
    equipo: raw.Equipo?.toString() || null,
    unidadDeNegocio: raw.UnidadDeNegocio?.toString() || null,
    productor: raw.Productor?.toString() || null,
    idPersonaAsesor: castToInt(raw.idPersonaAsesor),
    referidor: raw.Referidor?.toString() || null,
    arancel: raw.Arancel?.toString() || null,
    esquemaComisiones: raw.EsquemaComisiones?.toString() || null,
    fechaAlta: castToDate(raw.FechaAlta),
    porcentaje: porcentaje!,
    cuitFacturacion: raw.CuitFacturacion?.toString() || null,
    esJuridica: castToBoolean(raw.esJuridica),
    pais: raw.Pais?.toString() || null
  };
  
  return { valid: true, row: validRow };
}

/**
 * Procesa un array de filas raw del Excel Comisiones
 * 
 * @param rawRows - Filas raw leídas del Excel
 * @param config - Configuración del parser
 * @returns Resultado del parsing con métricas
 */
export function parseComisiones(
  rawRows: ComisionesRawRow[],
  config: ParserConfig = {}
): ParseComisionesResult {
  const startTime = Date.now();
  
  const validRows: ComisionesValidRow[] = [];
  const invalidRows: Array<{ row: number; errors: string[] }> = [];
  const warnings: string[] = [];
  
  rawRows.forEach((raw, index) => {
    const rowNumber = index + (config.headerRow || 1) + 1;
    
    const result = validateComisionesRow(raw, rowNumber);
    
    if (result.valid) {
      validRows.push(result.row);
    } else {
      invalidRows.push({ row: rowNumber, errors: result.errors });
    }
  });
  
  const endTime = Date.now();
  
  const metrics: IngestaMetrics = {
    filasLeidas: rawRows.length,
    filasValidas: validRows.length,
    filasRechazadas: invalidRows.length,
    filasInsertadas: 0, // Se actualiza después de DB insert
    tiempoMs: endTime - startTime,
    warnings,
    errors: invalidRows.flatMap(r => r.errors)
  };
  
  return {
    validRows,
    invalidRows,
    metrics
  };
}

/**
 * Valida que la suma de comisiones allocadas por operación = comisión total (±0.01)
 * Se usa para validar splits de comisión por grupo de filas
 * 
 * @param rows - Filas de una misma operación (mismo fecha/comitente/ticker)
 * @returns true si es válido, false si excede tolerancia
 */
export function validateCommissionSplits(rows: ComisionesValidRow[]): boolean {
  if (rows.length === 0) return true;
  if (rows.length === 1 && rows[0].porcentaje === 100) return true;
  
  // Asumir que todas las filas son de la misma operación
  const comisionBase = rows[0].comisionDolarizada;
  
  const sumAlloc = rows.reduce((acc, row) => {
    const alloc = (row.comisionDolarizada * row.porcentaje) / 100;
    return acc + alloc;
  }, 0);
  
  const diff = Math.abs(comisionBase - sumAlloc);
  const tolerance = 0.01;
  
  return diff <= tolerance;
}




