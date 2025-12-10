/**
 * Utilidades para detectar tipo de archivo AUM y extraer mes/año del reporte
 *
 * AI_DECISION: Extraer lógica de detección a módulo separado
 * Justificación: Facilita testing y reutilización en diferentes contextos
 * Impacto: Código más mantenible y testeable
 */

/**
 * Detecta el tipo de archivo AUM basado en el nombre
 *
 * @param filename - Nombre del archivo (con o sin extensión)
 * @returns 'master' si es archivo madre, 'monthly' si es mensual
 */
export function detectAumFileType(filename: string): 'master' | 'monthly' {
  const normalized = filename.toLowerCase();

  // Archivo master contiene "Balanz Cactus 2025" o similar
  if (normalized.includes('balanz cactus') && normalized.includes('2025')) {
    return 'master';
  }

  // Archivo mensual contiene "reporteClusterCuentasV2" o similar
  if (normalized.includes('reportecluster') || normalized.includes('cluster')) {
    return 'monthly';
  }

  // Por defecto, asumir mensual
  return 'monthly';
}

/**
 * Extrae mes y año del nombre del archivo o usa fecha actual
 *
 * @param filename - Nombre del archivo
 * @param fileType - Tipo de archivo detectado
 * @returns Objeto con reportMonth y reportYear, o null si no se puede determinar
 */
export function extractReportPeriod(
  filename: string,
  fileType: 'master' | 'monthly'
): { reportMonth: number; reportYear: number } | null {
  // Para archivos master, no necesitamos mes/año específico
  if (fileType === 'master') {
    return null;
  }

  // Intentar extraer mes/año del nombre del archivo
  // Patrones comunes: "reporteClusterCuentasV2_2025_01.csv", "2025-01-reporte.csv", etc.
  const monthYearPatterns = [
    /(\d{4})[_-](\d{1,2})/, // 2025_01, 2025-01
    /(\d{1,2})[_-](\d{4})/, // 01_2025, 01-2025
    /(\d{4})(\d{2})/, // 202501
  ];

  for (const pattern of monthYearPatterns) {
    const match = filename.match(pattern);
    if (match) {
      let year: number;
      let month: number;

      if (pattern === monthYearPatterns[2]) {
        // Formato YYYYMM
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
      } else {
        // Formato YYYY_MM o MM_YYYY
        const first = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);

        // Si el primer número es >= 2000, es año; si es <= 12, es mes
        if (first >= 2000) {
          year = first;
          month = second;
        } else if (second >= 2000) {
          year = second;
          month = first;
        } else {
          // Ambos son pequeños, asumir YYYY_MM
          year = first >= 100 ? first : second;
          month = first >= 100 ? second : first;
        }
      }

      // Validar mes
      if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
        return { reportMonth: month, reportYear: year };
      }
    }
  }

  // Si no se puede extraer del nombre, usar fecha actual
  const now = new Date();
  return {
    reportMonth: now.getMonth() + 1, // getMonth() retorna 0-11
    reportYear: now.getFullYear(),
  };
}

/**
 * Detecta tipo de archivo y extrae período en una sola llamada
 *
 * @param filename - Nombre del archivo
 * @param manualFileType - Tipo de archivo especificado manualmente (opcional)
 * @param manualReportMonth - Mes especificado manualmente (opcional)
 * @param manualReportYear - Año especificado manualmente (opcional)
 * @returns Objeto con fileType, reportMonth y reportYear
 */
export function detectAumFileMetadata(
  filename: string,
  manualFileType?: 'master' | 'monthly',
  manualReportMonth?: number,
  manualReportYear?: number
): {
  fileType: 'master' | 'monthly';
  reportMonth: number | null;
  reportYear: number | null;
} {
  const fileType = manualFileType || detectAumFileType(filename);

  // Si se especificó manualmente, usar esos valores
  if (manualReportMonth && manualReportYear) {
    return {
      fileType,
      reportMonth: manualReportMonth,
      reportYear: manualReportYear,
    };
  }

  // Intentar extraer del nombre
  const period = extractReportPeriod(filename, fileType);

  return {
    fileType,
    reportMonth: period?.reportMonth ?? null,
    reportYear: period?.reportYear ?? null,
  };
}
