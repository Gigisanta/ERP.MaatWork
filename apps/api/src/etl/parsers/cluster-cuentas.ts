/**
 * Parser para el reporte "Cluster Cuentas" (Excel)
 * Implementa STORY 2 - KAN-123
 */

import type { 
  ClusterCuentasRawRow, 
  IngestaMetrics, 
  ParserConfig 
} from '../types';
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
 * Row validado y tipado del Excel "Cluster Cuentas"
 */
export interface ClusterCuentasValidRow {
  idcuenta: string | null;
  comitente: number; // NOT NULL después de validación
  cuotapartista: number; // NOT NULL después de validación
  cuenta: string | null;
  cuentaNorm: string; // Normalizada
  fechaAlta: Date | null;
  esJuridica: boolean | null;
  asesor: string | null;
  asesorNorm: string; // Normalizado
  equipo: string | null;
  unidad: string | null;
  arancel: string | null;
  esquemaComisiones: string | null;
  referidor: string | null;
  negocio: string | null;
  primerFondeo: Date | null;
  activo: boolean | null;
  activoUlt12Meses: boolean | null;
  aumEnDolares: number; // NOT NULL después de validación
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
 * Resultado del proceso de parsing y validación
 */
export interface ParseResult {
  validRows: ClusterCuentasValidRow[];
  invalidRows: Array<{ row: number; errors: string[] }>;
  metrics: IngestaMetrics;
}

/**
 * Valida y transforma una fila raw del Excel
 * 
 * @param raw - Fila raw del Excel
 * @param rowNumber - Número de fila (para logging)
 * @returns Row validado o array de errores
 */
export async function validateClusterCuentasRow(
  raw: ClusterCuentasRawRow,
  rowNumber: number
): Promise<{ valid: true; row: ClusterCuentasValidRow } | { valid: false; errors: string[] }> {
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
  
  const aumEnDolares = castToNumber(raw['AUM en Dolares'], 6);
  if (aumEnDolares === null || aumEnDolares < 0) {
    errors.push(`Fila ${rowNumber}: AUM en Dolares inválido o negativo`);
  }
  
  // Si hay errores críticos, retornar early
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Normalizar campos de texto
  const cuentaNorm = normalizeCuenta(raw.cuenta);
  const asesorNorm = normalizeAsesor(raw.asesor);
  
  // Procesar breakdowns
  const bolsaArg = castToNumber(raw['Bolsa Arg'], 6) || 0;
  const fondosArg = castToNumber(raw['Fondos Arg'], 6) || 0;
  const bolsaBci = castToNumber(raw['Bolsa BCI'], 6) || 0;
  const pesos = castToNumber(raw.pesos, 6) || 0;
  const mep = castToNumber(raw.mep, 6) || 0;
  const cable = castToNumber(raw.cable, 6) || 0;
  const cv7000 = castToNumber(raw.cv7000, 6) || 0;
  const cv10000 = castToNumber(raw.cv10000, 6) || 0;
  
  // Validar suma de breakdowns usando configuración
  const breakdowns = [bolsaArg, fondosArg, bolsaBci, pesos, mep, cable, cv7000, cv10000];
  
  // Importar configuración de parsing
  const { getParsingConfig } = await import('../config');
  const parsingConfig = getParsingConfig();
  
  if (!validateBreakdownSum(aumEnDolares!, breakdowns, parsingConfig)) {
    const sumBreakdowns = breakdowns.reduce((a,b) => a+b, 0);
    const diff = Math.abs(aumEnDolares! - sumBreakdowns);
    errors.push(
      `Fila ${rowNumber}: Suma de breakdowns (${sumBreakdowns.toFixed(2)}) no coincide con AUM (${aumEnDolares!.toFixed(2)}) - diferencia: ${diff.toFixed(2)}`
    );
  }
  
  // Warning pero no bloquea
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  const validRow: ClusterCuentasValidRow = {
    idcuenta: raw.idcuenta?.toString() || null,
    comitente: comitente!,
    cuotapartista: cuotapartista!,
    cuenta: raw.cuenta?.toString() || null,
    cuentaNorm,
    fechaAlta: castToDate(raw['Fecha de Alta']),
    esJuridica: castToBoolean(raw['Es Juridica']),
    asesor: raw.asesor?.toString() || null,
    asesorNorm,
    equipo: raw.equipo?.toString() || null,
    unidad: raw.unidad?.toString() || null,
    arancel: raw.arancel?.toString() || null,
    esquemaComisiones: raw['Esquema Comisiones']?.toString() || null,
    referidor: raw.referidor?.toString() || null,
    negocio: raw.negocio?.toString() || null,
    primerFondeo: castToDate(raw.primerfondeo),
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
 * Procesa un array de filas raw del Excel
 * 
 * @param rawRows - Filas raw leídas del Excel
 * @param config - Configuración del parser
 * @returns Resultado del parsing con métricas
 */
export async function parseClusterCuentas(
  rawRows: ClusterCuentasRawRow[],
  config: ParserConfig = {}
): Promise<ParseResult> {
  const startTime = Date.now();
  
  const validRows: ClusterCuentasValidRow[] = [];
  const invalidRows: Array<{ row: number; errors: string[] }> = [];
  const warnings: string[] = [];
  
  for (let index = 0; index < rawRows.length; index++) {
    const raw = rawRows[index];
    const rowNumber = index + (config.headerRow || 1) + 1;
    
    const result = await validateClusterCuentasRow(raw, rowNumber);
    
    if (result.valid) {
      validRows.push(result.row);
    } else {
      invalidRows.push({ row: rowNumber, errors: result.errors });
    }
  }
  
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
 * Según STORY 2: ≥ 99.5%
 * 
 * @param metrics - Métricas de ingesta
 * @returns true si cumple, false si no
 */
export function validarCriterioAceptacion(metrics: IngestaMetrics): boolean {
  const porcentaje = calcularPorcentajeValidas(metrics);
  return porcentaje >= 99.5;
}




