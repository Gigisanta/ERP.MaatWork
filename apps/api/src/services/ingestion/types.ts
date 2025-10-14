import { 
  maestroCuentas, 
  stagingMensual, 
  diffDetalle, 
  auditoriaCargas,
  asignacionesAsesor,
  snapshotsMaestro
} from '@cactus/db';

export interface ExcelRow {
  [key: string]: any;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  tipo: string;
  // Additional properties from the existing code
  mes?: string;
  nombreArchivo?: string;
  hashArchivo?: string;
  tamanoArchivo?: number;
  fechaCarga?: Date;
}

export interface CargaArchivoResponse {
  success: boolean;
  error?: string;
  warnings?: string[];
  cargaId?: string;
  metadata?: FileMetadata;
  validation?: any;
  isExisting?: boolean;
}

export interface DiffResponse {
  success: boolean;
  error?: string;
  cargaId?: string;
  diff?: {
    resumen: {
      totalNuevos: number;
      totalModificados: number;
      totalSinAsesor: number;
      totalAusentes: number;
    };
    detalles: any[];
  };
}

export interface AplicarCambiosResponse {
  success: boolean;
  error?: string;
  nuevos?: number;
  modificados?: number;
  asignaciones?: number;
  ausentesInactivados?: number;
}

export interface AsignacionAsesor {
  idcuenta: string;
  asesorNuevo: string;
  asesorAnterior?: string;
  motivo?: string;
}

// Export database tables
export { 
  maestroCuentas, 
  stagingMensual, 
  diffDetalle, 
  auditoriaCargas,
  asignacionesAsesor,
  snapshotsMaestro
};

// Type definitions for diff engine
export type DiffResult = {
  resumen: DiffResumen;
  detalles: (NuevoRegistro | ModificadoRegistro | AusenteRegistro | SinAsesorRegistro)[];
  // Legacy properties for backward compatibility
  nuevos?: NuevoRegistro[];
  modificados?: ModificadoRegistro[];
  ausentes?: AusenteRegistro[];
  sinAsesor?: SinAsesorRegistro[];
};

export type NuevoRegistro = {
  tipo: 'nuevo';
  idcuenta: string;
  data: any;
  // Additional properties for compatibility
  comitente?: number;
  cuotapartista?: number;
  descripcion?: string;
  asesor?: string;
  necesitaAsesor?: boolean;
};

export type ModificadoRegistro = {
  tipo: 'modificado';
  idcuenta: string;
  cambios: CamposCambiados;
  dataAnterior: any;
  dataNuevo: any;
  // Additional properties for compatibility
  comitenteAnterior?: number;
  cuotapartistaAnterior?: number;
  descripcionAnterior?: string;
  asesorAnterior?: string;
  comitenteNuevo?: number;
  cuotapartistaNuevo?: number;
  descripcionNueva?: string;
  asesorNuevo?: string;
  camposCambiados?: string[];
};

export type AusenteRegistro = {
  tipo: 'ausente';
  idcuenta: string;
  data: any;
  // Additional properties for compatibility
  comitente?: number;
  cuotapartista?: number;
  descripcion?: string;
  asesor?: string;
};

export type SinAsesorRegistro = {
  tipo: 'sin_asesor';
  idcuenta: string;
  data: any;
  // Additional properties for compatibility
  comitente?: number;
  cuotapartista?: number;
  descripcion?: string;
  asesor?: string;
  esNuevo?: boolean;
};

export type DiffResumen = {
  totalNuevos: number;
  totalModificados: number;
  totalAusentes: number;
  totalSinAsesor: number;
  // Additional properties for compatibility
  totalRegistros?: number;
  totalConAsesor?: number;
  porcentajeSinAsesor?: number;
};

export type DiffConfig = {
  ignorarCampos: string[];
  toleranciaNumerica: number;
  // Additional properties required by diff-engine
  claveEmparejamiento?: string;
  camposTrazables?: string[];
  incluirAsesorEnDiff?: boolean;
};

export type CamposCambiados = {
  [campo: string]: {
    anterior: any;
    nuevo: any;
  };
};

export const DEFAULT_DIFF_CONFIG: DiffConfig = {
  ignorarCampos: ['fechaModificacion', 'hashArchivo'],
  toleranciaNumerica: 0.01,
  claveEmparejamiento: 'idcuenta',
  camposTrazables: ['comitente', 'cuotapartista', 'descripcion', 'asesor'],
  incluirAsesorEnDiff: true
};