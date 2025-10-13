/**
 * Configuración del sistema de comparación mensual
 */

export const COMPARACION_MENSUAL_CONFIG = {
  // Configuración de archivos
  archivos: {
    maestro: {
      nombre: 'Balanz Cactus 2025',
      columnasObligatorias: ['idcuenta', 'comitente', 'cuotapartista', 'descripcion'],
      columnasOpcionales: ['asesor'],
      tamanoMaximo: 50 * 1024 * 1024, // 50MB
      extensionesPermitidas: ['.xlsx', '.xls']
    },
    
    mensual: {
      nombre: 'reporteClusterCuentasV2',
      columnasObligatorias: ['idcuenta', 'comitente', 'cuotapartista', 'descripcion'],
      columnasOpcionales: ['asesor'],
      tamanoMaximo: 100 * 1024 * 1024, // 100MB
      extensionesPermitidas: ['.xlsx', '.xls']
    }
  },

  // Configuración de validación
  validacion: {
    detectarDuplicados: true,
    normalizarTexto: true,
    validarTipos: true,
    porcentajeWarningSinAsesor: 50, // %
    tamanoWarningArchivo: 1000 // filas
  },

  // Configuración de diff
  diff: {
    claveEmparejamiento: 'idcuenta',
    camposTrazables: ['comitente', 'cuotapartista', 'descripcion'],
    incluirAsesorEnDiff: true,
    detectarAusentes: true,
    requiereConfirmacionAsesor: true
  },

  // Configuración de snapshots
  snapshots: {
    crearAntes: true,
    crearDespues: true,
    verificarIntegridad: true,
    retencionDias: 365
  },

  // Configuración de exportación
  exportacion: {
    formatosPermitidos: ['xlsx', 'csv'],
    incluirMetadatos: true,
    nombreArchivoTimestamp: true
  },

  // Configuración de auditoría
  auditoria: {
    registrarCambios: true,
    registrarUsuarios: true,
    registrarTimestamps: true,
    incluirContexto: true
  },

  // Configuración de performance
  performance: {
    tamanoLoteInsercion: 1000,
    timeoutProcesamiento: 300000, // 5 minutos
    maxRegistrosPorCarga: 100000,
    habilitarIndices: true
  },

  // Configuración de UI
  ui: {
    paginacionDefault: 100,
    maxPaginacion: 1000,
    mostrarWarnings: true,
    confirmacionAplicacion: true
  }
} as const;

export type ComparacionMensualConfig = typeof COMPARACION_MENSUAL_CONFIG;


