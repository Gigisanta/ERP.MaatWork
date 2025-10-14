/**
 * Parser para el CSV madre "Balanz Cactus 2025 - AUM Balanz.csv"
 * FUENTE AUTORITATIVA de AUM y owner por cuenta/cliente
 */

import type { IngestaMetrics, ParserConfig } from '../types';
import {
  normalizeCuenta,
  normalizeAsesor,
  castToInt,
  castToBoolean,
  castToDate,
  castToNumber,
  validateBreakdownSum
} from '../normalization';

/**
 * Row raw del CSV madre (coma decimal y formato dd/mm/yyyy)
 */
export interface AumMadreRawRow {
  Actualizado?: string | Date | null;
  idCuenta?: string | null;
  comitente?: number | string | null;
  cuotapartista?: number | string | null;
  Descripcion?: string | null; // nombre cuenta
  Asesor?: string | null; // puede ser nombre o ID
  MAIL?: string | null;
  'Fecha de Alta'?: string | Date | null;
  'Es Juridica'?: number | boolean | null;
  'asesor'?: string | null; // asesor(texto) desde CSV
  equipo?: string | null;
  unidad?: string | null;
  arancel?: string | null;
  'Esquema Comisiones'?: string | null;
  referidor?: string | null;
  negocio?: string | null;
  primerfondeo?: string | Date | null;
  activo?: number | boolean | null;
  'Activo ult. 12 meses'?: number | boolean | null;
  'AUM en Dolares'?: number | string | null; // coma decimal
  'Bolsa Arg'?: number | string | null;
  'Fondos Arg'?: number | string | null;
  'Bolsa BCI'?: number | string | null;
  pesos?: number | string | null;
  mep?: number | string | null;
  cable?: number | string | null;
  cv7000?: number | string | null;
  cv10000?: number | string | null;
}

/**
 * Row validado y tipado del CSV madre
 */
export interface AumMadreValidRow {
  actualizado: Date | null;
  idCuenta: string | null;
  comitente: number; // NOT NULL
  cuotapartista: number; // NOT NULL
  descripcion: string | null;
  descripcionNorm: string; // Normalizada
  asesor: string | null; // Asesor principal (puede ser ID o nombre)
  asesorTexto: string | null; // asesor(texto) redundante
  asesorNorm: string; // Normalizado
  mail: string | null;
  fechaAlta: Date | null;
  esJuridica: boolean | null;
  equipo: string | null;
  unidad: string | null;
  arancel: string | null;
  esquemaComisiones: string | null;
  referidor: string | null;
  negocio: string | null;
  primerFondeo: Date | null;
  activo: boolean | null;
  activoUlt12Meses: boolean | null;
  aumEnDolares: number; // NOT NULL
  bolsaArg: number;
  fondosArg: number;
  bolsaBci: number;
  pesos: number;
  mep: number;
  cable: number;
  cv7000: number;
  cv10000: number;
}

/**
 * Resultado del proceso de parsing
 */
export interface ParseAumMadreResult {
  validRows: AumMadreValidRow[];
  invalidRows: Array<{ row: number; errors: string[] }>;
  metrics: IngestaMetrics;
}

/**
 * Parsea fecha con formato dd/mm/yyyy típico de CSV argentinos
 * 
 * @param value - Fecha raw
 * @returns Date o null
 */
function parseDateDDMMYYYY(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  if (typeof value === 'string') {
    // Formato dd/mm/yyyy
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Fallback a Date.parse
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * Normaliza números con coma decimal (típico de CSV argentinos)
 * 
 * @param value - Valor con posible coma decimal
 * @returns number o null
 */
function parseDecimalComma(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Reemplazar coma por punto
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * Valida y transforma una fila raw del CSV madre
 * 
 * @param raw - Fila raw del CSV
 * @param rowNumber - Número de fila (para logging)
 * @returns Row validado o array de errores
 */
export function validateAumMadreRow(
  raw: AumMadreRawRow,
  rowNumber: number
): { valid: true; row: AumMadreValidRow } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  
  // Validar campos obligatorios
  const comitente = castToInt(raw.comitente);
  if (comitente === null) {
    errors.push(`Fila ${rowNumber}: comitente inválido o faltante`);
  }
  
  const cuotapartista = castToInt(raw.cuotapartista);
  if (cuotapartista === null) {
    errors.push(`Fila ${rowNumber}: cuotapartista inválido o faltante`);
  }
  
  // AUM con coma decimal
  const aumEnDolares = parseDecimalComma(raw['AUM en Dolares']);
  if (aumEnDolares === null || aumEnDolares < 0) {
    errors.push(`Fila ${rowNumber}: AUM en Dolares inválido o negativo`);
  }
  
  // Si hay errores críticos, retornar early
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Normalizar descripción de cuenta
  const descripcionNorm = normalizeCuenta(raw.Descripcion);
  
  // Normalizar asesor (priorizar Asesor sobre asesor(texto))
  const asesorRaw = raw.Asesor || raw['asesor'] || null;
  const asesorNorm = normalizeAsesor(asesorRaw);
  
  // Procesar breakdowns con coma decimal
  const bolsaArg = parseDecimalComma(raw['Bolsa Arg']) || 0;
  const fondosArg = parseDecimalComma(raw['Fondos Arg']) || 0;
  const bolsaBci = parseDecimalComma(raw['Bolsa BCI']) || 0;
  const pesos = parseDecimalComma(raw.pesos) || 0;
  const mep = parseDecimalComma(raw.mep) || 0;
  const cable = parseDecimalComma(raw.cable) || 0;
  const cv7000 = parseDecimalComma(raw.cv7000) || 0;
  const cv10000 = parseDecimalComma(raw.cv10000) || 0;
  
  // Validar suma de breakdowns (más permisivo)
  const breakdowns = [bolsaArg, fondosArg, bolsaBci, pesos, mep, cable, cv7000, cv10000];
  const sumBreakdowns = breakdowns.reduce((a,b) => a+b, 0);
  const diff = Math.abs(aumEnDolares! - sumBreakdowns);
  
  // Solo error si la diferencia es muy grande (>1% del AUM)
  if (diff > (aumEnDolares! * 0.01)) {
    errors.push(
      `Fila ${rowNumber}: Suma de breakdowns (${sumBreakdowns.toFixed(2)}) no coincide con AUM (${aumEnDolares!.toFixed(2)}) - diferencia: ${diff.toFixed(2)}`
    );
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  const validRow: AumMadreValidRow = {
    actualizado: parseDateDDMMYYYY(raw.Actualizado),
    idCuenta: raw.idCuenta?.toString() || null,
    comitente: comitente!,
    cuotapartista: cuotapartista!,
    descripcion: raw.Descripcion?.toString() || null,
    descripcionNorm,
    asesor: raw.Asesor?.toString() || null,
    asesorTexto: raw['asesor']?.toString() || null,
    asesorNorm,
    mail: raw.MAIL?.toString() || null,
    fechaAlta: parseDateDDMMYYYY(raw['Fecha de Alta']),
    esJuridica: castToBoolean(raw['Es Juridica']),
    equipo: raw.equipo?.toString() || null,
    unidad: raw.unidad?.toString() || null,
    arancel: raw.arancel?.toString() || null,
    esquemaComisiones: raw['Esquema Comisiones']?.toString() || null,
    referidor: raw.referidor?.toString() || null,
    negocio: raw.negocio?.toString() || null,
    primerFondeo: parseDateDDMMYYYY(raw.primerfondeo),
    activo: castToBoolean(raw.activo),
    activoUlt12Meses: castToBoolean(raw['Activo ult. 12 meses']),
    aumEnDolares: aumEnDolares!,
    bolsaArg,
    fondosArg,
    bolsaBci,
    pesos,
    mep,
    cable,
    cv7000,
    cv10000
  };
  
  return { valid: true, row: validRow };
}

/**
 * Procesa un array de filas raw del CSV madre
 * 
 * @param rawRows - Filas raw leídas del CSV
 * @param config - Configuración del parser
 * @returns Resultado del parsing con métricas
 */
export function parseAumMadre(
  rawRows: AumMadreRawRow[],
  config: ParserConfig = {}
): ParseAumMadreResult {
  const startTime = Date.now();
  
  const validRows: AumMadreValidRow[] = [];
  const invalidRows: Array<{ row: number; errors: string[] }> = [];
  const warnings: string[] = [];
  
  rawRows.forEach((raw, index) => {
    const rowNumber = index + (config.headerRow || 1) + 1;
    
    const result = validateAumMadreRow(raw, rowNumber);
    
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
 * Calcula estadísticas de calidad de datos
 * 
 * @param metrics - Métricas de ingesta
 * @returns Porcentaje de filas válidas
 */
export function calcularPorcentajeValidas(metrics: IngestaMetrics): number {
  if (metrics.filasLeidas === 0) return 0;
  return (metrics.filasValidas / metrics.filasLeidas) * 100;
}

/**
 * Valida que el porcentaje de filas válidas cumpla el criterio de aceptación
 * Según superprompt: ≥ 99.5%
 * 
 * @param metrics - Métricas de ingesta
 * @returns true si cumple, false si no
 */
export function validarCriterioAceptacion(metrics: IngestaMetrics): boolean {
  const porcentaje = calcularPorcentajeValidas(metrics);
  return porcentaje >= 99.5;
}

