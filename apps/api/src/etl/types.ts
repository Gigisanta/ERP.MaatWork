/**
 * Tipos compartidos para el sistema ETL de EPIC A
 * Datos & Atribución (AUM/Comisiones)
 */

import type { z } from 'zod';

/**
 * Row del Excel "Cluster Cuentas" (raw)
 */
export interface ClusterCuentasRawRow {
  idcuenta?: string | null;
  comitente?: number | string | null; // puede venir como decimal
  cuotapartista?: number | string | null; // puede venir como decimal
  cuenta?: string | null;
  'Fecha de Alta'?: Date | string | null;
  'Es Juridica'?: number | boolean | null;
  asesor?: string | null;
  equipo?: string | null;
  unidad?: string | null;
  arancel?: string | null;
  'Esquema Comisiones'?: string | null;
  referidor?: string | null;
  negocio?: string | null;
  primerfondeo?: Date | string | null;
  activo?: number | boolean | null;
  'Activo ult. 12 meses'?: number | boolean | null;
  'AUM en Dolares'?: number | null;
  'Bolsa Arg'?: number | null;
  'Fondos Arg'?: number | null;
  'Bolsa BCI'?: number | null;
  pesos?: number | null;
  mep?: number | null;
  cable?: number | null;
  cv7000?: number | null;
  cv10000?: number | null;
}

/**
 * Row del Excel "Comisiones" (raw)
 */
export interface ComisionesRawRow {
  FechaConcertacion?: Date | string | null;
  Comitente?: number | string | null;
  Cuotapartista?: number | string | null;
  Cuenta?: string | null;
  Tipo?: string | null;
  Descripcion?: string | null;
  Ticker?: string | null;
  Cantidad?: number | null;
  Precio?: number | null;
  PrecioRef?: number | null;
  IVAComision?: number | null;
  ComisionPesificada?: number | null;
  CotizacionDolar?: number | null;
  ComisionDolarizada?: number | null;
  Asesor?: string | null;
  CUILAsesor?: string | null;
  Equipo?: string | null;
  UnidadDeNegocio?: string | null;
  Productor?: string | null;
  idPersonaAsesor?: number | string | null;
  Referidor?: string | null;
  Arancel?: string | null;
  EsquemaComisiones?: string | null;
  FechaAlta?: Date | string | null;
  Porcentaje?: number | null;
  CuitFacturacion?: string | null;
  esJuridica?: number | boolean | null;
  Pais?: string | null;
}

/**
 * Resultado del proceso de normalización
 */
export interface NormalizacionResult<T> {
  normalized: T;
  warnings: string[];
  errors: string[];
}

/**
 * Métricas del proceso de ingesta
 */
export interface IngestaMetrics {
  filasLeidas: number;
  filasValidas: number;
  filasRechazadas: number;
  filasInsertadas: number;
  tiempoMs: number;
  warnings: string[];
  errors: string[];
}

/**
 * Configuración para el parser de Excel
 */
export interface ParserConfig {
  sheetName?: string;
  headerRow?: number;
  skipRows?: number;
  encoding?: string;
}

/**
 * Estado del job de integración
 */
export type JobStatus = 'pending' | 'running' | 'success' | 'warning' | 'failed';

/**
 * Resultado de la proyección a dimensiones/hechos
 */
export interface ProyeccionResult {
  clientesCreados: number;
  clientesActualizados: number;
  snapshotsCreados: number;
  errors: string[];
}




