import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '@cactus/db';
import { stagingMensual, auditoriaCargas } from '@cactus/db';
import type { ExcelRow, FileMetadata } from './types';
import type { ValidationResult } from './validation';
import { generateFileHash } from './validation';

/**
 * Servicio para manejar el staging de datos mensuales
 */
export class StagingService {
  private db = db();

  /**
   * Carga datos del Excel a la tabla de staging con idempotencia
   * @param metadata Metadatos del archivo
   * @param data Datos validados del Excel
   * @param userId ID del usuario que realiza la carga
   * @param validationResult Resultado de la validación con warnings de duplicados
   * @returns ID de la carga creada o existente
   */
  async loadToStaging(
    metadata: FileMetadata,
    data: ExcelRow[],
    userId: string,
    validationResult?: ValidationResult
  ): Promise<{ cargaId: string; isExisting: boolean; warnings: string[] }> {
    // Verificar si ya existe una carga con el mismo hash y mes
    const existingCarga = await this.db
      .select({ 
        id: auditoriaCargas.id,
        estado: auditoriaCargas.estado,
        totalRegistros: auditoriaCargas.totalRegistros
      })
      .from(auditoriaCargas)
      .where(
        and(
          eq(auditoriaCargas.mes, metadata.mes),
          eq(auditoriaCargas.hashArchivo, metadata.hashArchivo)
        )
      )
      .limit(1);

    if (existingCarga.length > 0) {
      // Idempotencia: retornar carga existente
      return {
        cargaId: existingCarga[0].id,
        isExisting: true,
        warnings: [`Archivo ya procesado para el mes ${metadata.mes}. Hash: ${metadata.hashArchivo.slice(0, 8)}...`]
      };
    }

    // Crear registro de auditoría
    const [carga] = await this.db
      .insert(auditoriaCargas)
      .values({
        mes: metadata.mes,
        nombreArchivo: metadata.nombreArchivo,
        hashArchivo: metadata.hashArchivo,
        tamanoArchivo: metadata.tamanoArchivo,
        totalRegistros: data.length,
        cargadoPorUserId: userId,
        estado: 'cargado'
      })
      .returning({ id: auditoriaCargas.id });

    const cargaId = carga.id;

    // Limpiar staging anterior para este mes (solo cargas no aplicadas)
    await this.cleanStagingForMonth(metadata.mes);

    // Insertar datos en staging
    const stagingData = data.map(row => ({
      cargaId,
      idcuenta: row.idcuenta,
      comitente: row.comitente,
      cuotapartista: row.cuotapartista,
      descripcion: row.descripcion,
      asesor: row.asesor,
      hashArchivo: metadata.hashArchivo
    }));

    // Insertar en lotes para mejor performance
    const batchSize = 1000;
    for (let i = 0; i < stagingData.length; i += batchSize) {
      const batch = stagingData.slice(i, i + batchSize);
      await this.db.insert(stagingMensual).values(batch);
    }

    // Agregar warnings de validación si existen
    const warnings = validationResult?.warnings || [];

    return {
      cargaId,
      isExisting: false,
      warnings
    };
  }

  /**
   * Limpia datos de staging para un mes específico (solo cargas no aplicadas)
   * @param mes Mes en formato YYYY-MM
   */
  async cleanStagingForMonth(mes: string): Promise<void> {
    // Buscar cargas del mes que no estén aplicadas
    const cargasToClean = await this.db
      .select({ id: auditoriaCargas.id })
      .from(auditoriaCargas)
      .where(
        and(
          eq(auditoriaCargas.mes, mes),
          sql`${auditoriaCargas.estado} IN ('cargado', 'revisando')`
        )
      );

    // Limpiar staging para estas cargas
    for (const carga of cargasToClean) {
      await this.db
        .delete(stagingMensual)
        .where(eq(stagingMensual.cargaId, carga.id));
    }
  }

  /**
   * Obtiene datos de staging para una carga específica
   * @param cargaId ID de la carga
   * @returns Datos de staging
   */
  async getStagingData(cargaId: string) {
    return await this.db
      .select()
      .from(stagingMensual)
      .where(eq(stagingMensual.cargaId, cargaId))
      .orderBy(stagingMensual.idcuenta);
  }

  /**
   * Obtiene resumen de una carga
   * @param cargaId ID de la carga
   * @returns Resumen de la carga
   */
  async getLoadSummary(cargaId: string) {
    const [carga] = await this.db
      .select()
      .from(auditoriaCargas)
      .where(eq(auditoriaCargas.id, cargaId))
      .limit(1);

    if (!carga) {
      throw new Error(`Carga con ID ${cargaId} no encontrada`);
    }

    // Contar registros en staging usando COUNT
    const [{ stagingCount }] = await this.db
      .select({ stagingCount: sql<number>`COUNT(*)::int` })
      .from(stagingMensual)
      .where(eq(stagingMensual.cargaId, cargaId));

    // Contar registros sin asesor
    const [{ sinAsesorCount }] = await this.db
      .select({ sinAsesorCount: sql<number>`COUNT(*)::int` })
      .from(stagingMensual)
      .where(
        and(
          eq(stagingMensual.cargaId, cargaId),
          isNull(stagingMensual.asesor)
        )
      );

    return {
      carga,
      stagingCount,
      sinAsesorCount,
      conAsesorCount: stagingCount - sinAsesorCount
    };
  }

  /**
   * Marca registros de staging como procesados
   * @param cargaId ID de la carga
   * @param ids IDs de los registros a marcar
   */
  async markAsProcessed(cargaId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await this.db
      .update(stagingMensual)
      .set({ procesado: true })
      .where(
        and(
          eq(stagingMensual.cargaId, cargaId),
          sql`${stagingMensual.id} = ANY(${ids})`
        )
      );
  }

  /**
   * Verifica si una carga ya existe por hash y mes
   * @param hashArchivo Hash SHA-256 del archivo
   * @param mes Mes en formato YYYY-MM
   * @returns Información de la carga existente o null
   */
  async checkExistingCarga(hashArchivo: string, mes: string) {
    const [existing] = await this.db
      .select()
      .from(auditoriaCargas)
      .where(
        and(
          eq(auditoriaCargas.mes, mes),
          eq(auditoriaCargas.hashArchivo, hashArchivo)
        )
      )
      .limit(1);

    return existing || null;
  }

  /**
   * Obtiene el historial de cargas para un mes
   * @param mes Mes en formato YYYY-MM
   * @returns Historial de cargas
   */
  async getLoadHistory(mes: string) {
    return await this.db
      .select()
      .from(auditoriaCargas)
      .where(eq(auditoriaCargas.mes, mes))
      .orderBy(auditoriaCargas.createdAt);
  }

  /**
   * Obtiene todas las cargas recientes
   * @param limit Límite de resultados
   * @returns Cargas recientes
   */
  async getRecentLoads(limit: number = 10) {
    return await this.db
      .select()
      .from(auditoriaCargas)
      .orderBy(auditoriaCargas.createdAt)
      .limit(limit);
  }
}

// Instancia singleton del servicio
export const stagingService = new StagingService();
