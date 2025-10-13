/**
 * Tests GWT (Given-When-Then) según Superprompt
 * Estos tests validan los casos clave del sistema de datos v2
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { db, dimClient, dimAdvisor, factAumSnapshot, factCommission, matchingAudit } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { loadAumMadre } from '../loaders/aum-madre-loader';
import { loadClusterCuentas } from '../loaders/cluster-cuentas-loader';
import { loadComisiones } from '../loaders/comisiones-loader';
import { matchClient, validateOwnerBenefMatch } from '../matching/matcher';
import type { AumMadreValidRow } from '../parsers/aum-madre';
import type { ClusterCuentasValidRow } from '../parsers/cluster-cuentas';
import type { ComisionesValidRow } from '../parsers/comisiones';

describe('Superprompt GWT Tests', () => {
  
  beforeEach(async () => {
    // Limpiar datos de test antes de cada test
    // NOTA: Esto requiere implementar una función de cleanup o usar transacciones
    // await cleanupTestData();
  });

  /**
   * GWT 1: Owner desde Madre
   * Given: una cuenta ya presente en Madre
   * When: entra un Mensual que propone otro asesor
   * Then: el owner persiste desde Madre y el mensual solo actualiza campos no autoritativos
   */
  test('GWT 1: Owner desde Madre persiste sobre Mensual', async () => {
    // GIVEN: Cuenta en Excel Madre con owner
    const madreRow: AumMadreValidRow = {
      actualizado: new Date('2025-10-11'),
      idCuenta: '12345',
      comitente: 12345,
      cuotapartista: 67890,
      descripcion: 'CUENTA EJEMPLO SA',
      descripcionNorm: 'CUENTA EJEMPLO SA',
      asesor: 'Juan Perez',
      asesorTexto: 'Juan Perez',
      asesorNorm: 'JUAN PEREZ',
      mail: 'test@example.com',
      fechaAlta: new Date('2020-01-01'),
      esJuridica: true,
      equipo: 'Equipo A',
      unidad: 'Unidad 1',
      arancel: 'Arancel 1',
      esquemaComisiones: 'Esquema 1',
      referidor: null,
      negocio: 'Negocio 1',
      primerFondeo: new Date('2020-01-15'),
      activo: true,
      activoUlt12Meses: true,
      aumEnDolares: 1000000,
      bolsaArg: 500000,
      fondosArg: 500000,
      bolsaBci: 0,
      pesos: 0,
      mep: 0,
      cable: 0,
      cv7000: 0,
      cv10000: 0
    };

    // Cargar desde Madre
    const madreResult = await loadAumMadre([madreRow], {
      snapshotDate: new Date('2025-10-11')
    });

    expect(madreResult.clientesCreados).toBeGreaterThan(0);
    
    // Verificar que cliente tiene descubiertoEnMadre=true
    const clienteEnMadre = await db()
      .select()
      .from(dimClient)
      .where(
        and(
          eq(dimClient.comitente, 12345),
          eq(dimClient.cuotapartista, 67890)
        )
      )
      .limit(1);
    
    expect(clienteEnMadre.length).toBe(1);
    expect(clienteEnMadre[0].descubiertoEnMadre).toBe(true);

    // Obtener asesor owner original
    const snapshotOriginal = await db()
      .select()
      .from(factAumSnapshot)
      .where(
        and(
          eq(factAumSnapshot.idClient, clienteEnMadre[0].id),
          eq(factAumSnapshot.snapshotDate, '2025-10-11')
        )
      )
      .limit(1);
    
    expect(snapshotOriginal.length).toBe(1);
    const ownerOriginalId = snapshotOriginal[0].idAdvisorOwner;
    expect(ownerOriginalId).not.toBeNull();

    // WHEN: Entra Mensual con otro asesor
    const mensualRow: ClusterCuentasValidRow = {
      idcuenta: '12345',
      comitente: 12345,
      cuotapartista: 67890,
      cuenta: 'Cuenta Ejemplo SA',
      cuentaNorm: 'CUENTA EJEMPLO SA',
      fechaAlta: new Date('2020-01-01'),
      esJuridica: true,
      asesor: 'Maria Lopez', // OTRO ASESOR
      asesorNorm: 'MARIA LOPEZ',
      equipo: 'Equipo B', // OTRO EQUIPO
      unidad: 'Unidad 2', // OTRA UNIDAD
      arancel: 'Arancel 1',
      esquemaComisiones: 'Esquema 1',
      referidor: null,
      negocio: 'Negocio 1',
      primerFondeo: new Date('2020-01-15'),
      activo: true,
      activoUlt12Meses: true,
      aumEnDolares: 1100000, // Diferente AUM
      bolsaArg: 550000,
      fondosArg: 550000,
      bolsaBci: 0,
      pesos: 0,
      mep: 0,
      cable: 0,
      cv7000: 0,
      cv10000: 0
    };

    const mensualResult = await loadClusterCuentas([mensualRow], {
      snapshotDate: new Date('2025-10-11')
    });

    expect(mensualResult.clientesActualizados).toBe(1);
    expect(mensualResult.clientesCreados).toBe(0);

    // THEN: Owner persiste desde Madre
    const clientePostMensual = await db()
      .select()
      .from(dimClient)
      .where(
        and(
          eq(dimClient.comitente, 12345),
          eq(dimClient.cuotapartista, 67890)
        )
      )
      .limit(1);
    
    // El cliente debe tener descubiertoEnMadre=true y descubiertoEnMensual=true
    expect(clientePostMensual[0].descubiertoEnMadre).toBe(true);
    expect(clientePostMensual[0].descubiertoEnMensual).toBe(true);
    
    // Equipo/Unidad deben actualizarse desde Mensual (campos no-autoritativos)
    expect(clientePostMensual[0].equipo).toBe('Equipo B');
    expect(clientePostMensual[0].unidad).toBe('Unidad 2');

    // PERO el snapshot de AUM NO debe cambiar (Madre tiene prioridad)
    const snapshotPostMensual = await db()
      .select()
      .from(factAumSnapshot)
      .where(
        and(
          eq(factAumSnapshot.idClient, clienteEnMadre[0].id),
          eq(factAumSnapshot.snapshotDate, '2025-10-11')
        )
      )
      .limit(1);
    
    expect(snapshotPostMensual.length).toBe(1);
    expect(snapshotPostMensual[0].idAdvisorOwner).toBe(ownerOriginalId); // MISMO OWNER
    expect(parseFloat(snapshotPostMensual[0].aumUsd)).toBe(1000000); // MISMO AUM
  });

  /**
   * GWT 2: Alta descubierta por Mensual
   * Given: idcuenta inexistente en Madre
   * When: entra en Mensual
   * Then: se crea dim_cuenta con descubierto_por_mensual=true
   */
  test('GWT 2: Alta descubierta por Mensual', async () => {
    // GIVEN: idcuenta inexistente en Madre

    // WHEN: Entra en Mensual
    const mensualRow: ClusterCuentasValidRow = {
      idcuenta: '99999',
      comitente: 99999,
      cuotapartista: 88888,
      cuenta: 'Cuenta Nueva',
      cuentaNorm: 'CUENTA NUEVA',
      fechaAlta: new Date('2025-01-01'),
      esJuridica: false,
      asesor: 'Pedro Gomez',
      asesorNorm: 'PEDRO GOMEZ',
      equipo: 'Equipo C',
      unidad: 'Unidad 3',
      arancel: 'Arancel 2',
      esquemaComisiones: 'Esquema 2',
      referidor: null,
      negocio: 'Negocio 2',
      primerFondeo: new Date('2025-01-15'),
      activo: true,
      activoUlt12Meses: true,
      aumEnDolares: 500000,
      bolsaArg: 250000,
      fondosArg: 250000,
      bolsaBci: 0,
      pesos: 0,
      mep: 0,
      cable: 0,
      cv7000: 0,
      cv10000: 0
    };

    const result = await loadClusterCuentas([mensualRow], {
      snapshotDate: new Date('2025-10-11')
    });

    expect(result.clientesCreados).toBe(1);

    // THEN: Cliente creado con descubiertoEnMensual=true
    const clienteNuevo = await db()
      .select()
      .from(dimClient)
      .where(
        and(
          eq(dimClient.comitente, 99999),
          eq(dimClient.cuotapartista, 88888)
        )
      )
      .limit(1);
    
    expect(clienteNuevo.length).toBe(1);
    expect(clienteNuevo[0].descubiertoEnMadre).toBe(false);
    expect(clienteNuevo[0].descubiertoEnMensual).toBe(true);

    // Snapshot de AUM sin owner (porque no vino de Madre)
    const snapshot = await db()
      .select()
      .from(factAumSnapshot)
      .where(
        and(
          eq(factAumSnapshot.idClient, clienteNuevo[0].id),
          eq(factAumSnapshot.snapshotDate, '2025-10-11')
        )
      )
      .limit(1);
    
    expect(snapshot.length).toBe(1);
    expect(snapshot[0].idAdvisorOwner).toBeNull(); // Sin owner porque no vino de Madre
  });

  /**
   * GWT 3: Atribución
   * Given: ComisionDolarizada=100 y Porcentaje=37.5
   * When: materializo la fact
   * Then: comision_usd_alloc=37.50 y cierre por operación ±0.01
   */
  test('GWT 3: Atribución de comisiones con split', async () => {
    // GIVEN: Comisión con split
    const comisionRow: ComisionesValidRow = {
      fechaConcertacion: new Date('2025-10-11'),
      comitente: 12345,
      cuotapartista: 67890,
      cuenta: 'Cuenta Ejemplo SA',
      cuentaNorm: 'CUENTA EJEMPLO SA',
      tipo: 'Compra',
      descripcion: 'Compra de activo',
      ticker: 'TICKER',
      cantidad: 1000,
      precio: 100,
      precioRef: 100,
      ivaComision: 0,
      comisionPesificada: 0,
      cotizacionDolar: 1,
      comisionDolarizada: 100, // Comisión total
      asesor: 'Juan Perez',
      asesorNorm: 'JUAN PEREZ',
      cuilAsesor: '20-12345678-9',
      equipo: 'Equipo A',
      unidadDeNegocio: 'Unidad 1',
      productor: null,
      idPersonaAsesor: 123,
      referidor: null,
      arancel: 'Arancel 1',
      esquemaComisiones: 'Esquema 1',
      fechaAlta: new Date('2020-01-01'),
      porcentaje: 37.5, // 37.5% del total
      cuitFacturacion: null,
      esJuridica: false,
      pais: 'AR'
    };

    // Primero crear el cliente si no existe
    // (simplificado para el test)

    // WHEN: Cargar comisión
    const result = await loadComisiones([comisionRow], {
      upsertAdvisors: true
    });

    expect(result.comisionesCreadas).toBe(1);

    // THEN: comision_usd_alloc = 37.50 (100 * 37.5 / 100)
    const comisiones = await db()
      .select()
      .from(factCommission)
      .where(eq(factCommission.fecha, '2025-10-11'))
      .limit(1);
    
    expect(comisiones.length).toBe(1);
    
    const comisionUsd = parseFloat(comisiones[0].comisionUsd);
    const comisionUsdAlloc = parseFloat(comisiones[0].comisionUsdAlloc);
    const porcentajeAlloc = parseFloat(comisiones[0].porcentajeAlloc || '100');

    expect(comisionUsd).toBe(100);
    expect(comisionUsdAlloc).toBeCloseTo(37.5, 2);
    expect(porcentajeAlloc).toBe(37.5);

    // Verificar cierre ±0.01
    const expectedAlloc = (comisionUsd * porcentajeAlloc) / 100;
    const diff = Math.abs(comisionUsdAlloc - expectedAlloc);
    expect(diff).toBeLessThanOrEqual(0.01);
  });

  /**
   * GWT 4: Matching P1→P4
   * Given: coincidencia por comitente exacta
   * When: ejecuto matching
   * Then: el estado es matched sin evaluar reglas posteriores
   */
  test('GWT 4: Matching P1 (comitente exacto) tiene prioridad', async () => {
    // GIVEN: Cliente existente en dim_client
    const clienteExistente = await db()
      .insert(dimClient)
      .values({
        comitente: 54321,
        cuotapartista: 98765,
        cuentaNorm: 'CLIENTE TEST',
        idcuenta: '54321',
        esJuridica: false,
        fechaAlta: '2020-01-01',
        activo: true,
        primerFondeo: '2020-01-15',
        equipo: 'Equipo D',
        unidad: 'Unidad 4',
        descubiertoEnMadre: true,
        descubiertoEnMensual: false
      })
      .returning({ id: dimClient.id });

    // WHEN: Ejecuto matching por comitente
    const matchResult = await matchClient(
      54321, // comitente exacto
      11111, // cuotapartista diferente (debe ignorarse)
      'NOMBRE DIFERENTE', // cuenta_norm diferente (debe ignorarse)
      { fuzzyEnabled: true, fuzzyThreshold: 2 }
    );

    // THEN: Match por P1 (comitente)
    expect(matchResult.matched).toBe(true);
    expect(matchResult.matchStatus).toBe('matched');
    expect(matchResult.matchRule).toBe('P1_comitente');
    expect(matchResult.confidence).toBe(1.0);
    expect(matchResult.targetClientId).toBe(clienteExistente[0].id);
  });

  /**
   * GWT 5: Fuzzy ≤2 marca pending (no auto-confirma)
   * Given: sólo coincide por cuenta_norm con distancia 2
   * When: ejecuto matching
   * Then: estado=pending con pendiente_manual=true
   */
  test('GWT 5: Fuzzy match ≤2 marca pending para revisión manual', async () => {
    // GIVEN: Cliente existente con cuenta_norm
    const clienteExistente = await db()
      .insert(dimClient)
      .values({
        comitente: 11111,
        cuotapartista: 22222,
        cuentaNorm: 'CUENTA SIMILAR', // Similar a "CUENTA SIMULAR" (distancia 2)
        idcuenta: '11111',
        esJuridica: false,
        fechaAlta: '2020-01-01',
        activo: true,
        primerFondeo: '2020-01-15',
        equipo: 'Equipo E',
        unidad: 'Unidad 5',
        descubiertoEnMadre: true,
        descubiertoEnMensual: false
      })
      .returning({ id: dimClient.id });

    // WHEN: Ejecuto matching con fuzzy
    const matchResult = await matchClient(
      99999, // comitente no existe (P1 no match)
      99999, // cuotapartista no existe (P2 no match)
      'CUENTA SIMULAR', // Similar con distancia 2 (P4 fuzzy)
      { fuzzyEnabled: true, fuzzyThreshold: 2 }
    );

    // THEN: Fuzzy match marca pending (no auto-confirma)
    expect(matchResult.matched).toBe(false);
    expect(matchResult.matchStatus).toBe('pending');
    expect(matchResult.matchRule).toBe('P4_fuzzy');
    expect(matchResult.confidence).toBeGreaterThan(0);
    expect(matchResult.candidates).toBeDefined();
    expect(matchResult.candidates!.length).toBeGreaterThan(0);
  });

  /**
   * GWT 6: Mismatch owner/benef
   * Given: owner (Madre) ≠ beneficiario (Comisiones)
   * When: proceso
   * Then: estado=mismatch_owner_benef con ticket en cola de resolución
   */
  test('GWT 6: Mismatch owner vs beneficiario se detecta correctamente', async () => {
    // GIVEN: Cliente con owner desde Madre
    const ownerAdvisor = await db()
      .insert(dimAdvisor)
      .values({
        idPersonaAsesor: 100,
        asesorNorm: 'JUAN PEREZ',
        cuilAsesor: '20-12345678-9',
        equipo: 'Equipo A',
        unidad: 'Unidad 1',
        arancel: null,
        esquemaComisiones: null,
        referidor: null
      })
      .returning({ id: dimAdvisor.id });

    const benefAdvisor = await db()
      .insert(dimAdvisor)
      .values({
        idPersonaAsesor: 200,
        asesorNorm: 'MARIA LOPEZ',
        cuilAsesor: '27-98765432-1',
        equipo: 'Equipo B',
        unidad: 'Unidad 2',
        arancel: null,
        esquemaComisiones: null,
        referidor: null
      })
      .returning({ id: dimAdvisor.id });

    const cliente = await db()
      .insert(dimClient)
      .values({
        comitente: 77777,
        cuotapartista: 88888,
        cuentaNorm: 'CLIENTE MISMATCH',
        idcuenta: '77777',
        esJuridica: false,
        fechaAlta: '2020-01-01',
        activo: true,
        primerFondeo: '2020-01-15',
        equipo: 'Equipo A',
        unidad: 'Unidad 1',
        descubiertoEnMadre: true,
        descubiertoEnMensual: false
      })
      .returning({ id: dimClient.id });

    // Crear snapshot de AUM con owner
    await db()
      .insert(factAumSnapshot)
      .values({
        snapshotDate: '2025-10-11',
        idClient: cliente[0].id,
        idAdvisorOwner: ownerAdvisor[0].id, // Owner: Juan Perez
        aumUsd: '1000000',
        bolsaArg: '500000',
        fondosArg: '500000',
        bolsaBci: '0',
        pesos: '0',
        mep: '0',
        cable: '0',
        cv7000: '0',
        cv10000: '0'
      });

    // WHEN: Validar match con beneficiario diferente
    const baseMatchResult = {
      matched: true,
      matchStatus: 'matched' as const,
      matchRule: 'P1_comitente' as const,
      targetClientId: cliente[0].id,
      confidence: 1.0,
      context: { rule: 'P1_comitente', comitente: 77777 }
    };

    const validationResult = await validateOwnerBenefMatch(
      cliente[0].id,
      benefAdvisor[0].id, // Beneficiario: Maria Lopez (diferente del owner)
      baseMatchResult
    );

    // THEN: Debe detectar mismatch
    expect(validationResult.matchStatus).toBe('mismatch_owner_benef');
    expect(validationResult.matched).toBe(false);
    expect(validationResult.ownerAdvisorId).toBe(ownerAdvisor[0].id);
    expect(validationResult.benefAdvisorId).toBe(benefAdvisor[0].id);
    expect(validationResult.confidence).toBeLessThan(1.0);
    expect(validationResult.context.reason).toContain('Owner del cliente difiere del beneficiario');
  });
});

/**
 * Helper para limpiar datos de test
 * (implementar según necesidades)
 */
async function cleanupTestData() {
  // Limpiar tablas en orden inverso por FK constraints
  // await db().delete(factCommission).where(/* condición de test */);
  // await db().delete(factAumSnapshot).where(/* condición de test */);
  // await db().delete(matchingAudit).where(/* condición de test */);
  // await db().delete(dimClient).where(/* condición de test */);
  // await db().delete(dimAdvisor).where(/* condición de test */);
}



