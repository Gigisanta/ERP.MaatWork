import { Request } from 'express';
import * as XLSX from 'xlsx';
import { 
  validateSchema, 
  normalizeData, 
  extractMonthFromFileName, 
  generateFileHash,
  type ExcelRow,
  type FileMetadata,
  type ValidationResult
} from './validation';

/**
 * Configuración para la carga de archivos Excel
 */
export interface LoaderConfig {
  maxFileSize: number; // en bytes
  allowedExtensions: string[];
  sheetName?: string; // nombre específico de la hoja, undefined = primera hoja
  columnMapping?: Record<string, string>; // mapeo de columnas
}

/**
 * Resultado de la carga de un archivo Excel
 */
export interface LoadResult {
  success: boolean;
  metadata?: FileMetadata;
  data?: ExcelRow[];
  validation?: ValidationResult;
  error?: string;
  warnings?: string[];
}

/**
 * Configuración por defecto para el loader
 */
const DEFAULT_CONFIG: LoaderConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: ['.xlsx', '.xls'],
  sheetName: undefined, // usar primera hoja
  columnMapping: {} // sin mapeo por defecto
};

/**
 * Carga y procesa un archivo Excel desde la request de Express
 * @param req Request de Express con el archivo
 * @param config Configuración del loader
 * @returns Resultado de la carga
 */
export async function loadExcelFromRequest(
  req: Request,
  config: Partial<LoaderConfig> = {}
): Promise<LoadResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Verificar que hay archivo en la request
    if (!req.file) {
      return {
        success: false,
        error: 'No se proporcionó ningún archivo'
      };
    }

    const file = req.file;
    const warnings: string[] = [];

    // Validar tamaño del archivo
    if (file.size > finalConfig.maxFileSize) {
      return {
        success: false,
        error: `El archivo es demasiado grande. Máximo permitido: ${Math.round(finalConfig.maxFileSize / 1024 / 1024)}MB`
      };
    }

    // Validar extensión
    const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!finalConfig.allowedExtensions.includes(extension)) {
      return {
        success: false,
        error: `Extensión de archivo no permitida. Permitidas: ${finalConfig.allowedExtensions.join(', ')}`
      };
    }

    // Generar metadatos del archivo
    const hashArchivo = generateFileHash(file.buffer);
    const mes = extractMonthFromFileName(file.originalname);

    const metadata: FileMetadata = {
      nombreArchivo: file.originalname,
      tamanoArchivo: file.size,
      hashArchivo,
      fechaCarga: new Date(),
      mes
    };

    // Parsear Excel
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    
    // Seleccionar hoja
    const sheetName = finalConfig.sheetName || workbook.SheetNames[0];
    if (!workbook.Sheets[sheetName]) {
      return {
        success: false,
        error: `Hoja '${sheetName}' no encontrada en el archivo. Hojas disponibles: ${workbook.SheetNames.join(', ')}`
      };
    }

    const sheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: false
    });

    // Convertir a objetos con headers
    if (rawData.length === 0) {
      return {
        success: false,
        error: 'El archivo Excel está vacío'
      };
    }

    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1) as any[][];

    // Convertir a objetos
    const data = dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    // Validar esquema
    const validation = validateSchema(data, finalConfig.columnMapping);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Errores de validación encontrados',
        validation,
        warnings: [...warnings, ...validation.warnings]
      };
    }

    // Normalizar datos (ya filtra duplicados internamente)
    const normalizedData = normalizeData(data, finalConfig.columnMapping);

    // Agregar warnings de duplicados si existen
    if (validation.duplicateIds.length > 0) {
      warnings.push(...validation.warnings);
    }

    return {
      success: true,
      metadata,
      data: normalizedData,
      validation,
      warnings: [...warnings, ...validation.warnings]
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar el archivo'
    };
  }
}

/**
 * Carga un archivo Excel desde una ruta del sistema de archivos
 * @param filePath Ruta al archivo Excel
 * @param config Configuración del loader
 * @returns Resultado de la carga
 */
export async function loadExcelFromPath(
  filePath: string,
  config: Partial<LoaderConfig> = {}
): Promise<LoadResult> {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    // Verificar que el archivo existe
    await fs.access(filePath);

    // Leer archivo
    const buffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);

    // Crear objeto file mock para compatibilidad
    const mockFile = {
      buffer,
      originalname: fileName,
      size: stats.size
    };

    const mockReq = {
      file: mockFile
    } as Request;

    return await loadExcelFromRequest(mockReq, config);

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al leer el archivo'
    };
  }
}

/**
 * Configuraciones predefinidas para diferentes tipos de archivos
 */
export const LOADER_CONFIGS: Record<string, LoaderConfig> = {
  // Configuración para reporteClusterCuentasV2
  clusterCuentas: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['.xlsx'],
    sheetName: undefined, // primera hoja
    columnMapping: {
      // Mapeo específico si las columnas tienen nombres diferentes
      // Por defecto, asumimos que los nombres coinciden
    }
  },

  // Configuración para Balanz Cactus 2025 (maestro)
  maestroBalanz: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.xlsx', '.xls'],
    sheetName: undefined,
    columnMapping: {
      // Ajustar según la estructura real del archivo maestro
    }
  },

  // Configuración genérica
  generic: DEFAULT_CONFIG
};

/**
 * Helper para obtener configuración por tipo de archivo
 */
export function getLoaderConfig(type: keyof typeof LOADER_CONFIGS): LoaderConfig {
  return LOADER_CONFIGS[type];
}
