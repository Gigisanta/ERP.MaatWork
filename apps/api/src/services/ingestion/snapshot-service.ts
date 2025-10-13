import { eq, sql } from 'drizzle-orm';
import { db } from '@cactus/db';
import { maestroCuentas, snapshotsMaestro } from '@cactus/db';
import { generateFileHash } from './validation';

/**
 * Servicio para crear y gestionar snapshots del maestro
 */
export class SnapshotService {
  private db = db();

  /**
   * Crea un snapshot del estado actual del maestro
   * @param cargaId ID de la carga asociada
   * @param tipo Tipo de snapshot ('antes' o 'despues')
   * @returns ID del snapshot creado
   */
  async createSnapshot(cargaId: string, tipo: 'antes' | 'despues'): Promise<string> {
    // Obtener todos los registros del maestro
    const maestroData = await this.db
      .select()
      .from(maestroCuentas)
      .where(eq(maestroCuentas.activo, true));

    // Convertir a JSON para almacenamiento
    const datosJson = maestroData.map((record: any) => ({
      id: record.id,
      idcuenta: record.idcuenta,
      comitente: record.comitente,
      cuotapartista: record.cuotapartista,
      descripcion: record.descripcion,
      asesor: record.asesor,
      activo: record.activo,
      fechaAlta: record.fechaAlta,
      fechaUltimaActualizacion: record.fechaUltimaActualizacion,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));

    // Calcular hash de los datos para verificación de integridad
    const datosString = JSON.stringify(datosJson, null, 2);
    const hashDatos = generateFileHash(Buffer.from(datosString, 'utf-8'));

    // Crear snapshot
    const [snapshot] = await this.db
      .insert(snapshotsMaestro)
      .values({
        cargaId,
        tipo,
        datos: datosJson,
        totalRegistros: maestroData.length,
        hashDatos
      })
      .returning({ id: snapshotsMaestro.id });

    return snapshot.id;
  }

  /**
   * Obtiene un snapshot por ID
   * @param snapshotId ID del snapshot
   * @returns Datos del snapshot
   */
  async getSnapshot(snapshotId: string) {
    const [snapshot] = await this.db
      .select()
      .from(snapshotsMaestro)
      .where(eq(snapshotsMaestro.id, snapshotId))
      .limit(1);

    if (!snapshot) {
      throw new Error(`Snapshot con ID ${snapshotId} no encontrado`);
    }

    return snapshot;
  }

  /**
   * Obtiene snapshots de una carga específica
   * @param cargaId ID de la carga
   * @returns Array de snapshots (antes y después)
   */
  async getSnapshotsByCarga(cargaId: string) {
    return await this.db
      .select()
      .from(snapshotsMaestro)
      .where(eq(snapshotsMaestro.cargaId, cargaId))
      .orderBy(snapshotsMaestro.createdAt);
  }

  /**
   * Compara dos snapshots y retorna las diferencias
   * @param snapshotAntesId ID del snapshot "antes"
   * @param snapshotDespuesId ID del snapshot "después"
   * @returns Diferencias detectadas
   */
  async compareSnapshots(snapshotAntesId: string, snapshotDespuesId: string) {
    const snapshotAntes = await this.getSnapshot(snapshotAntesId);
    const snapshotDespues = await this.getSnapshot(snapshotDespuesId);

    const datosAntes = snapshotAntes.datos as any[];
    const datosDespues = snapshotDespues.datos as any[];

    // Crear mapas para búsqueda eficiente
    const mapaAntes = new Map<string, any>();
    const mapaDespues = new Map<string, any>();

    datosAntes.forEach(record => mapaAntes.set(record.idcuenta, record));
    datosDespues.forEach(record => mapaDespues.set(record.idcuenta, record));

    const cambios = {
      nuevos: [] as any[],
      modificados: [] as any[],
      eliminados: [] as any[]
    };

    // Detectar nuevos y modificados
    for (const [idcuenta, recordDespues] of mapaDespues) {
      const recordAntes = mapaAntes.get(idcuenta);

      if (!recordAntes) {
        // Registro nuevo
        cambios.nuevos.push(recordDespues);
      } else {
        // Verificar si hay cambios
        const camposCambiados = this.detectChanges(recordAntes, recordDespues);
        if (camposCambiados.length > 0) {
          cambios.modificados.push({
            idcuenta,
            anterior: recordAntes,
            nuevo: recordDespues,
            camposCambiados
          });
        }
      }
    }

    // Detectar eliminados (inactivados)
    for (const [idcuenta, recordAntes] of mapaAntes) {
      const recordDespues = mapaDespues.get(idcuenta);
      
      if (!recordDespues) {
        // Registro eliminado/inactivado
        cambios.eliminados.push(recordAntes);
      }
    }

    return {
      resumen: {
        totalAntes: datosAntes.length,
        totalDespues: datosDespues.length,
        nuevos: cambios.nuevos.length,
        modificados: cambios.modificados.length,
        eliminados: cambios.eliminados.length
      },
      cambios
    };
  }

  /**
   * Detecta cambios entre dos registros
   * @param anterior Registro anterior
   * @param nuevo Registro nuevo
   * @returns Array de campos que cambiaron
   */
  private detectChanges(anterior: any, nuevo: any): string[] {
    const campos = ['comitente', 'cuotapartista', 'descripcion', 'asesor', 'activo'];
    const cambios: string[] = [];

    for (const campo of campos) {
      const valorAnterior = anterior[campo];
      const valorNuevo = nuevo[campo];

      // Normalizar valores para comparación
      const normalizadoAnterior = this.normalizeForComparison(valorAnterior);
      const normalizadoNuevo = this.normalizeForComparison(valorNuevo);

      if (normalizadoAnterior !== normalizadoNuevo) {
        cambios.push(campo);
      }
    }

    return cambios;
  }

  /**
   * Normaliza valores para comparación
   */
  private normalizeForComparison(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  /**
   * Verifica la integridad de un snapshot
   * @param snapshotId ID del snapshot
   * @returns true si la integridad es correcta
   */
  async verifySnapshotIntegrity(snapshotId: string): Promise<boolean> {
    const snapshot = await this.getSnapshot(snapshotId);
    
    // Recalcular hash
    const datosString = JSON.stringify(snapshot.datos, null, 2);
    const hashCalculado = generateFileHash(Buffer.from(datosString, 'utf-8'));
    
    return hashCalculado === snapshot.hashDatos;
  }

  /**
   * Exporta un snapshot a formato JSON
   * @param snapshotId ID del snapshot
   * @returns JSON string del snapshot
   */
  async exportSnapshotToJSON(snapshotId: string): Promise<string> {
    const snapshot = await this.getSnapshot(snapshotId);
    
    return JSON.stringify({
      metadata: {
        id: snapshot.id,
        cargaId: snapshot.cargaId,
        tipo: snapshot.tipo,
        totalRegistros: snapshot.totalRegistros,
        hashDatos: snapshot.hashDatos,
        createdAt: snapshot.createdAt
      },
      datos: snapshot.datos
    }, null, 2);
  }

  /**
   * Elimina snapshots antiguos (más de 1 año)
   * @returns Número de snapshots eliminados
   */
  async cleanupOldSnapshots(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await this.db
      .delete(snapshotsMaestro)
      .where(
        sql`${snapshotsMaestro.createdAt} < ${oneYearAgo.toISOString()}`
      );

    return result.rowCount || 0;
  }
}

// Instancia singleton del servicio
export const snapshotService = new SnapshotService();
