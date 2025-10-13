import { eq } from 'drizzle-orm';
import { db } from '@cactus/db';
import { 
  maestroCuentas, 
  stagingMensual, 
  diffDetalle, 
  auditoriaCargas,
  type DiffResult,
  type NuevoRegistro,
  type ModificadoRegistro,
  type AusenteRegistro,
  type SinAsesorRegistro,
  type DiffResumen,
  type DiffConfig,
  type CamposCambiados,
  DEFAULT_DIFF_CONFIG
} from './types';

/**
 * Motor de diff para comparar datos de staging con el maestro
 */
export class DiffEngine {
  private db = db();

  /**
   * Ejecuta el proceso de diff para una carga específica
   * @param cargaId ID de la carga
   * @param config Configuración del diff
   * @returns Resultado del diff
   */
  async executeDiff(cargaId: string, config: DiffConfig = DEFAULT_DIFF_CONFIG): Promise<DiffResult> {
    // Obtener datos de staging
    const stagingData = await this.db
      .select()
      .from(stagingMensual)
      .where(eq(stagingMensual.cargaId, cargaId));

    if (stagingData.length === 0) {
      throw new Error(`No se encontraron datos de staging para la carga ${cargaId}`);
    }

    // Obtener datos del maestro
    const maestroData = await this.db
      .select()
      .from(maestroCuentas)
      .where(eq(maestroCuentas.activo, true));

    // Crear mapas para búsqueda eficiente
    const maestroMap = new Map<string, typeof maestroData[0]>();
    for (const record of maestroData) {
      const key = this.generateKey(record, config.claveEmparejamiento);
      maestroMap.set(key, record);
    }

    const stagingMap = new Map<string, typeof stagingData[0]>();
    for (const record of stagingData) {
      const key = this.generateKey(record, config.claveEmparejamiento);
      stagingMap.set(key, record);
    }

    // Detectar cambios
    const nuevos: NuevoRegistro[] = [];
    const modificados: ModificadoRegistro[] = [];
    const ausentes: AusenteRegistro[] = [];
    const sinAsesor: SinAsesorRegistro[] = [];

    // Procesar cada registro de staging
    for (const stagingRecord of stagingData) {
      const key = this.generateKey(stagingRecord, config.claveEmparejamiento);
      const maestroRecord = maestroMap.get(key);

      if (!maestroRecord) {
        // Registro nuevo
        const nuevo: NuevoRegistro = {
          idcuenta: stagingRecord.idcuenta,
          comitente: stagingRecord.comitente,
          cuotapartista: stagingRecord.cuotapartista,
          descripcion: stagingRecord.descripcion,
          asesor: stagingRecord.asesor || undefined,
          necesitaAsesor: !stagingRecord.asesor
        };
        nuevos.push(nuevo);

        // Agregar a sin asesor si no tiene
        if (!stagingRecord.asesor) {
          sinAsesor.push({
            idcuenta: stagingRecord.idcuenta,
            comitente: stagingRecord.comitente,
            cuotapartista: stagingRecord.cuotapartista,
            descripcion: stagingRecord.descripcion,
            esNuevo: true
          });
        }
      } else {
        // Verificar si hay modificaciones en campos trazables
        const cambios = this.detectChanges(maestroRecord, stagingRecord, config.camposTrazables);
        
        // Verificar cambios de asesor si está habilitado
        const asesorCambio = config.incluirAsesorEnDiff && 
          this.normalizeForComparison(maestroRecord.asesor) !== this.normalizeForComparison(stagingRecord.asesor);
        
        if (cambios.length > 0 || asesorCambio) {
          const modificado: ModificadoRegistro = {
            idcuenta: stagingRecord.idcuenta,
            // Valores anteriores (del maestro)
            comitenteAnterior: maestroRecord.comitente,
            cuotapartistaAnterior: maestroRecord.cuotapartista,
            descripcionAnterior: maestroRecord.descripcion,
            asesorAnterior: maestroRecord.asesor || undefined,
            // Valores nuevos (del staging)
            comitenteNuevo: stagingRecord.comitente,
            cuotapartistaNuevo: stagingRecord.cuotapartista,
            descripcionNueva: stagingRecord.descripcion,
            asesorNuevo: stagingRecord.asesor || undefined,
            // Metadatos
            camposCambiados: asesorCambio ? [...cambios, 'asesor'] : cambios,
            necesitaAsesor: !maestroRecord.asesor // Si el maestro no tiene asesor, necesita asignación
          };
          modificados.push(modificado);

          // Agregar a sin asesor si no tiene asesor en el maestro
          if (!maestroRecord.asesor) {
            sinAsesor.push({
              idcuenta: stagingRecord.idcuenta,
              comitente: stagingRecord.comitente,
              cuotapartista: stagingRecord.cuotapartista,
              descripcion: stagingRecord.descripcion,
              esNuevo: false
            });
          }
        }
      }
    }

    // Detectar ausentes: registros en maestro pero no en staging
    for (const maestroRecord of maestroData) {
      const key = this.generateKey(maestroRecord, config.claveEmparejamiento);
      const stagingRecord = stagingMap.get(key);

      if (!stagingRecord) {
        // Registro ausente
        const ausente: AusenteRegistro = {
          idcuenta: maestroRecord.idcuenta,
          comitente: maestroRecord.comitente,
          cuotapartista: maestroRecord.cuotapartista,
          descripcion: maestroRecord.descripcion,
          asesor: maestroRecord.asesor || undefined,
          requiereInactivacion: false // Por defecto no se inactiva
        };
        ausentes.push(ausente);
      }
    }

    // Generar resumen
    const resumen: DiffResumen = {
      totalNuevos: nuevos.length,
      totalModificados: modificados.length,
      totalAusentes: ausentes.length,
      totalSinAsesor: sinAsesor.length,
      totalConAsesor: stagingData.length - sinAsesor.length,
      totalRegistros: stagingData.length,
      porcentajeSinAsesor: stagingData.length > 0 ? (sinAsesor.length / stagingData.length) * 100 : 0
    };

    // Guardar detalles del diff en la base de datos
    await this.saveDiffDetails(cargaId, nuevos, modificados, ausentes);

    // Actualizar estadísticas en auditoria_cargas
    await this.updateAuditStats(cargaId, resumen);

    return {
      nuevos,
      modificados,
      ausentes,
      sinAsesor,
      resumen
    };
  }

  /**
   * Genera clave de emparejamiento para un registro
   */
  private generateKey(record: any, tipo: 'idcuenta' | 'comitente_cuotapartista'): string {
    if (tipo === 'idcuenta') {
      return record.idcuenta;
    } else {
      return `${record.comitente}_${record.cuotapartista}`;
    }
  }

  /**
   * Detecta cambios entre un registro del maestro y uno de staging
   */
  private detectChanges(
    maestroRecord: any,
    stagingRecord: any,
    camposTrazables: CamposCambiados[]
  ): CamposCambiados[] {
    const cambios: CamposCambiados[] = [];

    for (const campo of camposTrazables) {
      const valorMaestro = maestroRecord[campo];
      const valorStaging = stagingRecord[campo];

      // Normalizar valores para comparación
      const normalizadoMaestro = this.normalizeForComparison(valorMaestro);
      const normalizadoStaging = this.normalizeForComparison(valorStaging);

      if (normalizadoMaestro !== normalizadoStaging) {
        cambios.push(campo);
      }
    }

    return cambios;
  }

  /**
   * Normaliza valores para comparación (trim, lowercase, etc.)
   */
  private normalizeForComparison(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  /**
   * Guarda detalles del diff en la tabla diff_detalle
   */
  private async saveDiffDetails(
    cargaId: string,
    nuevos: NuevoRegistro[],
    modificados: ModificadoRegistro[],
    ausentes: AusenteRegistro[]
  ): Promise<void> {
    const detalles = [];

    // Agregar nuevos
    for (const nuevo of nuevos) {
      detalles.push({
        cargaId,
        tipo: 'nuevo' as const,
        idcuenta: nuevo.idcuenta,
        comitenteNuevo: nuevo.comitente,
        cuotapartistaNuevo: nuevo.cuotapartista,
        descripcionNueva: nuevo.descripcion,
        asesorNuevo: nuevo.asesor,
        camposCambiados: ['comitente', 'cuotapartista', 'descripcion', 'asesor'],
        requiereConfirmacionAsesor: false
      });
    }

    // Agregar modificados
    for (const modificado of modificados) {
      const requiereConfirmacionAsesor = modificado.camposCambiados.includes('asesor');
      
      detalles.push({
        cargaId,
        tipo: 'modificado' as const,
        idcuenta: modificado.idcuenta,
        comitenteAnterior: modificado.comitenteAnterior,
        cuotapartistaAnterior: modificado.cuotapartistaAnterior,
        descripcionAnterior: modificado.descripcionAnterior,
        asesorAnterior: modificado.asesorAnterior,
        comitenteNuevo: modificado.comitenteNuevo,
        cuotapartistaNuevo: modificado.cuotapartistaNuevo,
        descripcionNueva: modificado.descripcionNueva,
        asesorNuevo: modificado.asesorNuevo,
        camposCambiados: modificado.camposCambiados,
        requiereConfirmacionAsesor
      });
    }

    // Agregar ausentes
    for (const ausente of ausentes) {
      detalles.push({
        cargaId,
        tipo: 'ausente' as const,
        idcuenta: ausente.idcuenta,
        comitenteAnterior: ausente.comitente,
        cuotapartistaAnterior: ausente.cuotapartista,
        descripcionAnterior: ausente.descripcion,
        asesorAnterior: ausente.asesor,
        comitenteNuevo: null,
        cuotapartistaNuevo: null,
        descripcionNueva: null,
        asesorNuevo: null,
        camposCambiados: [],
        requiereConfirmacionAsesor: false
      });
    }

    // Insertar en lotes
    if (detalles.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < detalles.length; i += batchSize) {
        const batch = detalles.slice(i, i + batchSize);
        await this.db.insert(diffDetalle).values(batch);
      }
    }
  }

  /**
   * Actualiza estadísticas en auditoria_cargas
   */
  private async updateAuditStats(cargaId: string, resumen: DiffResumen): Promise<void> {
    await this.db
      .update(auditoriaCargas)
      .set({
        nuevosDetectados: resumen.totalNuevos,
        modificadosDetectados: resumen.totalModificados,
        ausentesDetectados: resumen.totalAusentes,
        sinAsesor: resumen.totalSinAsesor,
        estado: 'revisando'
      })
      .where(eq(auditoriaCargas.id, cargaId));
  }

  /**
   * Obtiene el resumen de diff para una carga
   * @param cargaId ID de la carga
   * @returns Resumen del diff
   */
  async getDiffSummary(cargaId: string): Promise<DiffResumen> {
    const [carga] = await this.db
      .select()
      .from(auditoriaCargas)
      .where(eq(auditoriaCargas.id, cargaId))
      .limit(1);

    if (!carga) {
      throw new Error(`Carga con ID ${cargaId} no encontrada`);
    }

    return {
      totalNuevos: carga.nuevosDetectados,
      totalModificados: carga.modificadosDetectados,
      totalAusentes: carga.ausentesDetectados || 0,
      totalSinAsesor: carga.sinAsesor,
      totalConAsesor: carga.totalRegistros - carga.sinAsesor,
      totalRegistros: carga.totalRegistros,
      porcentajeSinAsesor: carga.totalRegistros > 0 ? (carga.sinAsesor / carga.totalRegistros) * 100 : 0
    };
  }

  /**
   * Obtiene detalles del diff para una carga
   * @param cargaId ID de la carga
   * @returns Detalles del diff
   */
  async getDiffDetails(cargaId: string) {
    return await this.db
      .select()
      .from(diffDetalle)
      .where(eq(diffDetalle.cargaId, cargaId))
      .orderBy(diffDetalle.tipo, diffDetalle.idcuenta);
  }
}

// Instancia singleton del motor de diff
export const diffEngine = new DiffEngine();
