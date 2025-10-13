import { eq, and, sql } from 'drizzle-orm';
import { db } from '@cactus/db';
import { 
  maestroCuentas, 
  diffDetalle, 
  auditoriaCargas, 
  asignacionesAsesor 
} from '@cactus/db';
import { snapshotService } from './snapshot-service';
import type { AsignacionAsesor } from './types';

/**
 * Resultado de la aplicación de cambios
 */
export interface AplicacionResult {
  nuevosInsertados: number;
  modificadosActualizados: number;
  ausentesInactivados: number;
  asignacionesAplicadas: number;
  snapshotAntesId: string;
  snapshotDespuesId: string;
  warnings: string[];
}

/**
 * Servicio para aplicar cambios al maestro de forma transaccional
 */
export class AplicarCambiosService {
  private db = db();

  /**
   * Aplica todos los cambios pendientes para una carga
   * @param cargaId ID de la carga
   * @param userId ID del usuario que aplica los cambios
   * @param asignacionesAsesor Asignaciones manuales de asesor (opcional)
   * @returns Resultado de la aplicación
   */
  async aplicarCambios(
    cargaId: string,
    userId: string,
    asignacionesAsesor?: AsignacionAsesor[]
  ): Promise<AplicacionResult> {
    // Verificar estado de la carga
    const [carga] = await this.db
      .select()
      .from(auditoriaCargas)
      .where(eq(auditoriaCargas.id, cargaId))
      .limit(1);

    if (!carga) {
      throw new Error(`Carga con ID ${cargaId} no encontrada`);
    }

    if (carga.estado !== 'revisando') {
      throw new Error(`La carga debe estar en estado 'revisando' para aplicar cambios. Estado actual: ${carga.estado}`);
    }

    // Iniciar transacción
          return await this.db.transaction(async (tx: any) => {
      const warnings: string[] = [];
      let nuevosInsertados = 0;
      let modificadosActualizados = 0;
      let ausentesInactivados = 0;
      let asignacionesAplicadas = 0;

      // 1. Crear snapshot ANTES de aplicar cambios
      const snapshotAntesId = await snapshotService.createSnapshot(cargaId, 'antes');

      // 2. Obtener todos los cambios pendientes
      const cambios = await tx
        .select()
        .from(diffDetalle)
        .where(
          and(
            eq(diffDetalle.cargaId, cargaId),
            eq(diffDetalle.aplicado, false)
          )
        );

      // 3. Aplicar cambios por tipo
      for (const cambio of cambios) {
        switch (cambio.tipo) {
          case 'nuevo':
            await this.aplicarNuevo(tx, cambio);
            nuevosInsertados++;
            break;

          case 'modificado':
            await this.aplicarModificado(tx, cambio);
            modificadosActualizados++;
            break;

          case 'ausente':
            // Los ausentes no se procesan automáticamente
            // Solo se marcan como aplicados si el usuario confirmó la inactivación
            warnings.push(`Registro ausente ${cambio.idcuenta} requiere revisión manual`);
            break;
        }

        // Marcar cambio como aplicado
        await tx
          .update(diffDetalle)
          .set({ 
            aplicado: true,
            aplicadoEn: new Date()
          })
          .where(eq(diffDetalle.id, cambio.id));
      }

      // 4. Aplicar asignaciones de asesor si se proporcionaron
      if (asignacionesAsesor && asignacionesAsesor.length > 0) {
        asignacionesAplicadas = await this.aplicarAsignacionesAsesor(tx, cargaId, asignacionesAsesor, userId);
      }

      // 5. Crear snapshot DESPUÉS de aplicar cambios
      const snapshotDespuesId = await snapshotService.createSnapshot(cargaId, 'despues');

      // 6. Actualizar estado de la carga
      await tx
        .update(auditoriaCargas)
        .set({
          estado: 'aplicado',
          aplicadoEn: new Date(),
          aplicadoPorUserId: userId
        })
        .where(eq(auditoriaCargas.id, cargaId));

      return {
        nuevosInsertados,
        modificadosActualizados,
        ausentesInactivados,
        asignacionesAplicadas,
        snapshotAntesId,
        snapshotDespuesId,
        warnings
      };
    });
  }

  /**
   * Aplica un registro nuevo al maestro
   */
  private async aplicarNuevo(tx: any, cambio: any): Promise<void> {
    // Determinar el asesor (del cambio o asignación manual)
    const asesor = cambio.asesorNuevo || null;

    await tx
      .insert(maestroCuentas)
      .values({
        idcuenta: cambio.idcuenta,
        comitente: cambio.comitenteNuevo,
        cuotapartista: cambio.cuotapartistaNuevo,
        descripcion: cambio.descripcionNueva,
        asesor: asesor,
        activo: true,
        fechaAlta: new Date(),
        fechaUltimaActualizacion: new Date(),
        version: 1
      });
  }

  /**
   * Aplica modificaciones a un registro existente
   */
  private async aplicarModificado(tx: any, cambio: any): Promise<void> {
    // Obtener el registro actual del maestro
    const [registroActual] = await tx
      .select()
      .from(maestroCuentas)
      .where(eq(maestroCuentas.idcuenta, cambio.idcuenta))
      .limit(1);

    if (!registroActual) {
      throw new Error(`Registro maestro no encontrado para idcuenta: ${cambio.idcuenta}`);
    }

    // Preparar campos a actualizar
    const camposActualizados: any = {
      fechaUltimaActualizacion: new Date(),
      version: registroActual.version + 1
    };

    // Solo actualizar campos que cambiaron
    if (cambio.camposCambiados.includes('comitente')) {
      camposActualizados.comitente = cambio.comitenteNuevo;
    }
    if (cambio.camposCambiados.includes('cuotapartista')) {
      camposActualizados.cuotapartista = cambio.cuotapartistaNuevo;
    }
    if (cambio.camposCambiados.includes('descripcion')) {
      camposActualizados.descripcion = cambio.descripcionNueva;
    }

    // Para el asesor, solo actualizar si no requiere confirmación o si se confirmó
    if (cambio.camposCambiados.includes('asesor')) {
      if (!cambio.requiereConfirmacionAsesor) {
        // Cambio automático (sin confirmación requerida)
        camposActualizados.asesor = cambio.asesorNuevo;
      } else {
        // Cambio que requiere confirmación - mantener el asesor actual
        // La actualización se hará mediante asignaciones manuales
      }
    }

    await tx
      .update(maestroCuentas)
      .set(camposActualizados)
      .where(eq(maestroCuentas.idcuenta, cambio.idcuenta));
  }

  /**
   * Aplica asignaciones manuales de asesor
   */
  private async aplicarAsignacionesAsesor(
    tx: any,
    cargaId: string,
    asignaciones: AsignacionAsesor[],
    userId: string
  ): Promise<number> {
    let aplicadas = 0;

    for (const asignacion of asignaciones) {
      // Verificar que el registro existe
      const [registro] = await tx
        .select()
        .from(maestroCuentas)
        .where(eq(maestroCuentas.idcuenta, asignacion.idcuenta))
        .limit(1);

      if (!registro) {
        // Buscar en staging si es un registro nuevo
        const [stagingRecord] = await tx
          .select()
          .from(diffDetalle)
          .where(
            and(
              eq(diffDetalle.cargaId, cargaId),
              eq(diffDetalle.idcuenta, asignacion.idcuenta),
              eq(diffDetalle.tipo, 'nuevo')
            )
          )
          .limit(1);

        if (!stagingRecord) {
          continue; // Skip si no se encuentra el registro
        }
      }

      // Guardar asignación en tabla de auditoría
      await tx
        .insert(asignacionesAsesor)
        .values({
          cargaId,
          idcuenta: asignacion.idcuenta,
          asesorAnterior: asignacion.asesorAnterior,
          asesorNuevo: asignacion.asesorNuevo,
          motivo: asignacion.motivo,
          aplicado: true,
          asignadoPorUserId: userId
        });

      // Si el registro ya existe en el maestro, actualizarlo
      if (registro) {
        await tx
          .update(maestroCuentas)
          .set({
            asesor: asignacion.asesorNuevo,
            fechaUltimaActualizacion: new Date(),
            version: registro.version + 1
          })
          .where(eq(maestroCuentas.idcuenta, asignacion.idcuenta));
      }

      aplicadas++;
    }

    return aplicadas;
  }

  /**
   * Inactiva registros ausentes confirmados
   * @param cargaId ID de la carga
   * @param idcuentasAusentes Array de idcuenta a inactivar
   * @param userId ID del usuario
   */
  async inactivarAusentes(
    cargaId: string,
    idcuentasAusentes: string[],
    userId: string
  ): Promise<number> {
    if (idcuentasAusentes.length === 0) {
      return 0;
    }

          return await this.db.transaction(async (tx: any) => {
      // Actualizar registros en el maestro
      const result = await tx
        .update(maestroCuentas)
        .set({
          activo: false,
          fechaUltimaActualizacion: new Date()
        })
        .where(
          sql`${maestroCuentas.idcuenta} = ANY(${idcuentasAusentes})`
        );

      // Marcar cambios de ausentes como aplicados
      await tx
        .update(diffDetalle)
        .set({
          aplicado: true,
          aplicadoEn: new Date()
        })
        .where(
          and(
            eq(diffDetalle.cargaId, cargaId),
            eq(diffDetalle.tipo, 'ausente'),
            sql`${diffDetalle.idcuenta} = ANY(${idcuentasAusentes})`
          )
        );

      return result.rowCount || 0;
    });
  }

  /**
   * Revierte una aplicación de cambios (rollback)
   * @param cargaId ID de la carga
   * @param userId ID del usuario
   */
  async revertirCambios(cargaId: string, userId: string): Promise<boolean> {
    // Obtener snapshots de la carga
    const snapshots = await snapshotService.getSnapshotsByCarga(cargaId);
    
    if (snapshots.length < 2) {
      throw new Error('No se encontraron snapshots para revertir');
    }

    const snapshotAntes = snapshots.find((s: any) => s.tipo === 'antes');
    const snapshotDespues = snapshots.find((s: any) => s.tipo === 'despues');

    if (!snapshotAntes || !snapshotDespues) {
      throw new Error('Snapshots incompletos para revertir');
    }

          return await this.db.transaction(async (tx: any) => {
      // Restaurar datos del snapshot "antes"
      const datosAntes = snapshotAntes.datos as any[];

      // Limpiar tabla maestro
      await tx.delete(maestroCuentas);

      // Restaurar desde snapshot
      for (const record of datosAntes) {
        await tx.insert(maestroCuentas).values({
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
        });
      }

      // Marcar cambios como no aplicados
      await tx
        .update(diffDetalle)
        .set({ aplicado: false, aplicadoEn: null })
        .where(eq(diffDetalle.cargaId, cargaId));

      // Actualizar estado de la carga
      await tx
        .update(auditoriaCargas)
        .set({
          estado: 'revisando',
          aplicadoEn: null,
          aplicadoPorUserId: null
        })
        .where(eq(auditoriaCargas.id, cargaId));

      return true;
    });
  }
}

// Instancia singleton del servicio
export const aplicarCambiosService = new AplicarCambiosService();
