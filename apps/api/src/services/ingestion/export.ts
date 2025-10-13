import * as XLSX from 'xlsx';
import { eq } from 'drizzle-orm';
import { db } from '@cactus/db';
import { 
  maestroCuentas, 
  auditoriaCargas, 
  diffDetalle,
  snapshotsMaestro
} from '@cactus/db';

/**
 * Servicio para exportación de datos
 */
export class ExportService {
  private db = db();

  /**
   * Exporta el maestro actual a Excel con nombre dinámico
   * @param formato Formato de exportación ('xlsx' | 'csv')
   * @returns Buffer del archivo
   */
  async exportMaestro(formato: 'xlsx' | 'csv' = 'xlsx'): Promise<Buffer> {
    // Obtener datos del maestro
    const datos = await this.db
      .select()
      .from(maestroCuentas)
      .where(eq(maestroCuentas.activo, true))
      .orderBy(maestroCuentas.idcuenta);

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // Preparar datos para Excel
    const excelData = datos.map((record: any) => ({
      'ID Cuenta': record.idcuenta,
      'Comitente': record.comitente,
      'Cuotapartista': record.cuotapartista,
      'Descripción': record.descripcion,
      'Asesor': record.asesor || '',
      'Activo': record.activo ? 'Sí' : 'No',
      'Fecha Alta': record.fechaAlta?.toISOString().split('T')[0] || '',
      'Última Actualización': record.fechaUltimaActualizacion.toISOString().split('T')[0],
      'Versión': record.version
    }));

    // Crear hoja
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 15 }, // ID Cuenta
      { wch: 10 }, // Comitente
      { wch: 12 }, // Cuotapartista
      { wch: 30 }, // Descripción
      { wch: 20 }, // Asesor
      { wch: 8 },  // Activo
      { wch: 12 }, // Fecha Alta
      { wch: 15 }, // Última Actualización
      { wch: 8 }   // Versión
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maestro Cuentas');

    // Agregar hoja de metadatos
    const metadata = {
      'Exportado el': new Date().toISOString().split('T')[0],
      'Total Registros': datos.length,
      'Registros Activos': datos.filter((d: any) => d.activo).length,
      'Con Asesor': datos.filter((d: any) => d.asesor).length,
      'Sin Asesor': datos.filter((d: any) => !d.asesor).length
    };

    const metadataSheet = XLSX.utils.json_to_sheet([metadata]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadatos');

    // Convertir a buffer
    if (formato === 'csv') {
      // Exportar a CSV
      const csv = this.convertToCSV(excelData);
      return Buffer.from(csv, 'utf-8');
    } else {
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
  }

  /**
   * Convierte datos a formato CSV
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene coma
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Genera nombre de archivo para exportación
   */
  generateFileName(tipo: 'maestro' | 'diff', formato: 'xlsx' | 'csv', mes?: string): string {
    const fecha = mes || new Date().toISOString().slice(0, 7); // YYYY-MM
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    if (tipo === 'maestro') {
      return `maestro_actualizado_${fecha}.${formato}`;
    } else {
      return `diff_${fecha}_${timestamp}.${formato}`;
    }
  }

  /**
   * Exporta el maestro actual a CSV
   * @returns String CSV
   */
  async exportMaestroToCSV(): Promise<string> {
    const datos = await this.db
      .select()
      .from(maestroCuentas)
      .where(eq(maestroCuentas.activo, true))
      .orderBy(maestroCuentas.idcuenta);

    // Crear headers
    const headers = [
      'idcuenta',
      'comitente', 
      'cuotapartista',
      'descripcion',
      'asesor',
      'activo',
      'fecha_alta',
      'fecha_ultima_actualizacion',
      'version'
    ];

    // Crear filas
    const rows = datos.map((record: any) => [
      record.idcuenta,
      record.comitente,
      record.cuotapartista,
      `"${record.descripcion.replace(/"/g, '""')}"`, // Escapar comillas
      record.asesor || '',
      record.activo ? 'true' : 'false',
      record.fechaAlta?.toISOString().split('T')[0] || '',
      record.fechaUltimaActualizacion.toISOString().split('T')[0],
      record.version
    ]);

    // Combinar headers y rows
    const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
    
    return csvContent;
  }

  /**
   * Exporta detalles de cambios para una carga específica
   * @param cargaId ID de la carga
   * @returns Buffer del archivo Excel
   */
  async exportDiffToExcel(cargaId: string): Promise<Buffer> {
    // Obtener información de la carga
    const [carga] = await this.db
      .select()
      .from(auditoriaCargas)
      .where(eq(auditoriaCargas.id, cargaId))
      .limit(1);

    if (!carga) {
      throw new Error(`Carga con ID ${cargaId} no encontrada`);
    }

    // Obtener detalles del diff
    const detalles = await this.db
      .select()
      .from(diffDetalle)
      .where(eq(diffDetalle.cargaId, cargaId))
      .orderBy(diffDetalle.tipo, diffDetalle.idcuenta);

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // Preparar datos para Excel
    const excelData = detalles.map((detalle: any) => ({
      'Tipo': detalle.tipo === 'nuevo' ? 'NUEVO' : 'MODIFICADO',
      'ID Cuenta': detalle.idcuenta,
      'Comitente': detalle.tipo === 'nuevo' ? detalle.comitenteNuevo : `${detalle.comitenteAnterior} → ${detalle.comitenteNuevo}`,
      'Cuotapartista': detalle.tipo === 'nuevo' ? detalle.cuotapartistaNuevo : `${detalle.cuotapartistaAnterior} → ${detalle.cuotapartistaNuevo}`,
      'Descripción': detalle.tipo === 'nuevo' ? detalle.descripcionNueva : `${detalle.descripcionAnterior} → ${detalle.descripcionNueva}`,
      'Asesor': detalle.tipo === 'nuevo' ? (detalle.asesorNuevo || '') : `${detalle.asesorAnterior || ''} → ${detalle.asesorNuevo || ''}`,
      'Campos Cambiados': detalle.camposCambiados.join(', '),
      'Aplicado': detalle.aplicado ? 'Sí' : 'No',
      'Fecha Detección': detalle.createdAt.toISOString().split('T')[0]
    }));

    // Crear hoja principal
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 10 }, // Tipo
      { wch: 15 }, // ID Cuenta
      { wch: 20 }, // Comitente
      { wch: 20 }, // Cuotapartista
      { wch: 40 }, // Descripción
      { wch: 30 }, // Asesor
      { wch: 20 }, // Campos Cambiados
      { wch: 10 }, // Aplicado
      { wch: 15 }  // Fecha Detección
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cambios Detectados');

    // Agregar hoja de resumen
    const resumen = {
      'Carga ID': carga.id,
      'Mes': carga.mes,
      'Archivo': carga.nombreArchivo,
      'Fecha Carga': carga.createdAt.toISOString().split('T')[0],
      'Total Registros': carga.totalRegistros,
      'Nuevos Detectados': carga.nuevosDetectados,
      'Modificados Detectados': carga.modificadosDetectados,
      'Sin Asesor': carga.sinAsesor,
      'Estado': carga.estado
    };

    const resumenSheet = XLSX.utils.json_to_sheet([resumen]);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }


  /**
   * Obtiene estadísticas del maestro para reportes
   */
  async getMaestroStats() {
    const [total] = await this.db
      .select({ count: maestroCuentas.id })
      .from(maestroCuentas)
      .where(eq(maestroCuentas.activo, true));

    const [activos] = await this.db
      .select({ count: maestroCuentas.id })
      .from(maestroCuentas)
      .where(eq(maestroCuentas.activo, true));

    const [conAsesor] = await this.db
      .select({ count: maestroCuentas.id })
      .from(maestroCuentas)
      .where(
        eq(maestroCuentas.activo, true),
        // eq(maestroCuentas.asesor, null) // Esto necesitaría ser un WHERE AND
      );

    // Por simplicidad, obtenemos todos y contamos en memoria
    const todos = await this.db
      .select()
      .from(maestroCuentas)
      .where(eq(maestroCuentas.activo, true));

    return {
      total: todos.length,
      activos: todos.filter((r: any) => r.activo).length,
      conAsesor: todos.filter((r: any) => r.asesor).length,
      sinAsesor: todos.filter((r: any) => !r.asesor).length
    };
  }
}

// Instancia singleton del servicio de exportación
export const exportService = new ExportService();
