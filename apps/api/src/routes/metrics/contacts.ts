/**
 * Metrics Contacts Routes
 * 
 * Handles pipeline contact metrics calculations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts, pipelineStages, pipelineStageHistory, contactTags, tags } from '@cactus/db';
import { eq, and, isNull, sql, gte, lte, inArray, desc, asc, isNotNull, type InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';
import { z } from 'zod';
import { validate } from '../../utils/validation';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const metricsQuerySchema = z.object({
  month: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(12)).optional(),
  year: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(2000)).optional()
});

// ==========================================================
// Helper Functions
// ==========================================================

/**
 * Helper function para obtener primera vez que contactos entran a una etapa
 * AI_DECISION: Helper function para obtener primera vez que contactos entran a una etapa
 * Justificación: Reduce código duplicado, mejora performance usando agregaciones SQL, hace el código más mantenible
 * Impacto: Reemplaza 4 implementaciones repetitivas con una función optimizada
 */
async function getFirstTimeStageEntries(
  stageId: string,
  monthStart: Date,
  monthEnd: Date,
  accessFilter: ReturnType<typeof buildContactAccessFilter>
): Promise<Map<string, Date>> {
  // AI_DECISION: Filtrar por rango de fechas para contar solo contactos que entraron por primera vez en el mes
  // Justificación: Si un contacto entra a una etapa en Enero, luego va a otra etapa, y vuelve en Marzo,
  // no debemos contarlo en Marzo porque ya había estado en esa etapa antes
  // Impacto: Métricas correctas que no cuentan contactos que retroceden de etapa
  
  // AI_DECISION: Optimizar queries - obtener entradas en rango y verificar anteriores en batch
  // Justificación: La segunda query ya usa inArray (batch), pero optimizamos para evitar query innecesaria cuando no hay datos
  // Impacto: Mejora performance cuando no hay contactos para verificar (evita query vacía)
  
  // Obtener todas las entradas en el rango de fechas
  const entriesInRange = await db()
    .select({
      contactId: pipelineStageHistory.contactId,
      changedAt: pipelineStageHistory.changedAt
    })
    .from(pipelineStageHistory)
    .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
    .where(and(
      eq(pipelineStageHistory.toStage, stageId),
      gte(pipelineStageHistory.changedAt, monthStart),
      lte(pipelineStageHistory.changedAt, monthEnd),
      isNull(contacts.deletedAt),
      accessFilter.whereClause
    ));

  // Verificar para cada contacto si hay entradas anteriores a monthStart (solo si hay contactos para verificar)
  const firstEntryByContact = new Map<string, Date>();
  const contactIdsToCheck = new Set(entriesInRange.map((e: { contactId: string; changedAt: Date }) => e.contactId));

  // Batch query: verificar entradas anteriores solo si hay contactos para verificar
  if (contactIdsToCheck.size > 0) {
    const contactsWithEarlierEntries = await db()
      .selectDistinct({ contactId: pipelineStageHistory.contactId })
      .from(pipelineStageHistory)
      .where(and(
        eq(pipelineStageHistory.toStage, stageId),
        inArray(pipelineStageHistory.contactId, Array.from(contactIdsToCheck)),
        sql`${pipelineStageHistory.changedAt} < ${monthStart}`
      ));

    const contactsWithEarlierEntriesSet = new Set(
      contactsWithEarlierEntries.map((e: { contactId: string }) => e.contactId)
    );

    // Solo incluir contactos que NO tienen entradas anteriores (primera vez en el mes)
    for (const entry of entriesInRange) {
      if (!contactsWithEarlierEntriesSet.has(entry.contactId)) {
        const contactId = entry.contactId;
        const changedAt = entry.changedAt instanceof Date 
          ? entry.changedAt 
          : new Date(entry.changedAt);
        
        // Si ya existe, tomar el MIN (más temprano en el mes)
        const existing = firstEntryByContact.get(contactId);
        if (!existing || changedAt < existing) {
          firstEntryByContact.set(contactId, changedAt);
        }
      }
    }
  } else {
    // Si no hay entradas en rango, no hay nada que procesar
    // Esto optimiza el caso donde no hay datos, evitando query innecesaria
  }

  // También considerar contactos creados directamente en esta etapa (sin historial)
  const contactsCreatedInStage = await db()
    .select({
      id: contacts.id,
      createdAt: contacts.createdAt
    })
    .from(contacts)
    .where(and(
      eq(contacts.pipelineStageId, stageId),
      gte(contacts.createdAt, monthStart),
      lte(contacts.createdAt, monthEnd),
      isNull(contacts.deletedAt),
      accessFilter.whereClause
    ));

  // Agregar contactos creados directamente si no tienen historial
  const contactsWithHistory = new Set(firstEntryByContact.keys());
  for (const contact of contactsCreatedInStage) {
    if (!contactsWithHistory.has(contact.id)) {
      const createdAt = contact.createdAt instanceof Date 
        ? contact.createdAt 
        : new Date(contact.createdAt);
      firstEntryByContact.set(contact.id, createdAt);
    }
  }

  return firstEntryByContact;
}

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /metrics/contacts - Obtener métricas del pipeline
 */
router.get('/contacts',
  requireAuth,
  validate({ query: metricsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    
    // Get user access scope for data isolation
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    // AI_DECISION: Optimizar queries de pipeline stages - batch query en lugar de 5 queries secuenciales
    // Justificación: Reduce de 5 queries a 1 query (80% reducción), mejora latencia del endpoint
    // Impacto: Mejora significativa en performance del endpoint de métricas
    const stageNames = ['Contactado', 'Prospecto', 'Primera reunion', 'Segunda reunion', 'Cliente'];
    const allStages = await db()
      .select()
      .from(pipelineStages)
      .where(inArray(pipelineStages.name, stageNames));

    // Crear Map por nombre para acceso rápido
    type PipelineStage = InferSelectModel<typeof pipelineStages>;
    const stagesByName = new Map<string, PipelineStage>(allStages.map((stage: PipelineStage) => [stage.name, stage]));
    
    const contactadoStage = stagesByName.get('Contactado');
    const prospectoStage = stagesByName.get('Prospecto');
    const firstMeetingStage = stagesByName.get('Primera reunion');
    const secondMeetingStage = stagesByName.get('Segunda reunion');
    const clienteStage = stagesByName.get('Cliente');

    if (!contactadoStage || !firstMeetingStage || !secondMeetingStage || !clienteStage) {
      req.log.error({
        contactadoStage: !!contactadoStage,
        firstMeetingStage: !!firstMeetingStage,
        secondMeetingStage: !!secondMeetingStage,
        clienteStage: !!clienteStage
      }, 'Required pipeline stages not found');
      return res.status(500).json({ error: 'Pipeline stages not found' });
    }

    req.log.debug({
      contactadoStageId: contactadoStage.id,
      prospectoStageId: prospectoStage?.id,
      firstMeetingStageId: firstMeetingStage.id,
      secondMeetingStageId: secondMeetingStage.id,
      clienteStageId: clienteStage.id
    }, 'Pipeline stages loaded');

    // Usar mes/año actual si no se especifica
    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    // Calcular rango de fechas para el mes
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Helper para calcular métricas de un mes
    const calculateMonthlyMetrics = async (month: number, year: number) => {
      // Normalizar fechas a UTC para consistencia
      const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      req.log.debug({ month, year, monthStart, monthEnd }, 'Calculating monthly metrics');

      // AI_DECISION: Paralelizar las 4 llamadas a getFirstTimeStageEntries ya que son independientes.
      // Cada llamada ejecuta 2 queries (entradas en rango + verificación anteriores), totalizando 8 queries.
      // Al paralelizarlas, reducimos la latencia total de suma de queries a máximo de queries paralelas.
      const [contactadoByContact, firstMeetingByContact, secondMeetingByContact, clientByContact] = await Promise.all([
        getFirstTimeStageEntries(contactadoStage.id, monthStart, monthEnd, accessFilter),
        getFirstTimeStageEntries(firstMeetingStage.id, monthStart, monthEnd, accessFilter),
        getFirstTimeStageEntries(secondMeetingStage.id, monthStart, monthEnd, accessFilter),
        getFirstTimeStageEntries(clienteStage.id, monthStart, monthEnd, accessFilter)
      ]);

      // Nuevos contactos: contactos creados en el mes que entraron a Contactado (por primera vez) en el mes
      // Filtrar contactos que entraron por primera vez a Contactado en el mes
      const contactIdsEnteredContactadoInMonth = Array.from(contactadoByContact.entries())
        .filter(([_, firstEntryDate]) => {
          const entryDate = firstEntryDate instanceof Date ? firstEntryDate : new Date(firstEntryDate);
          const entryDateStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
          const monthEndDate = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
          return entryDateStart >= monthStartDate && entryDateStart <= monthEndDate;
        })
        .map(([contactId]) => contactId);

      // Verificar cuáles de estos contactos fueron creados en el mes (query batch)
      const contactsCreatedInMonth = contactIdsEnteredContactadoInMonth.length > 0 ? await db()
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(
          inArray(contacts.id, contactIdsEnteredContactadoInMonth),
          gte(contacts.createdAt, monthStart),
          lte(contacts.createdAt, monthEnd),
          isNull(contacts.deletedAt),
          accessFilter.whereClause
        )) : [];

      const newContactsCount = contactsCreatedInMonth.length;

      req.log.debug({ 
        month, 
        year, 
        newContactsFinal: newContactsCount,
        contactadoByContactSize: contactadoByContact.size,
        contactIdsEnteredContactadoInMonth: contactIdsEnteredContactadoInMonth.length,
        contactsCreatedInMonth: contactsCreatedInMonth.length
      }, 'New contacts calculated');

      // Primeras reuniones: contar solo la PRIMERA vez que cada contacto entra a "Primera reunion"
      // Contar solo los que entraron por primera vez en el mes
      let firstMeetingsCount = 0;
      for (const [contactId, firstEntryDate] of firstMeetingByContact.entries()) {
        const entryDate = firstEntryDate instanceof Date ? firstEntryDate : new Date(firstEntryDate);
        // Comparación precisa de fechas (sin hora, solo fecha)
        const entryDateStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
        const monthEndDate = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
        
        if (entryDateStart >= monthStartDate && entryDateStart <= monthEndDate) {
          firstMeetingsCount++;
        }
      }

      req.log.debug({
        month,
        year,
        firstMeetingsTotal: firstMeetingByContact.size,
        firstMeetingsInMonth: firstMeetingsCount
      }, 'First meetings calculated');

      // Segundas reuniones: contar solo la PRIMERA vez que cada contacto entra a "Segunda reunion"
      // Contar solo los que entraron por primera vez en el mes
      let secondMeetingsCount = 0;
      for (const [contactId, firstEntryDate] of secondMeetingByContact.entries()) {
        const entryDate = firstEntryDate instanceof Date ? firstEntryDate : new Date(firstEntryDate);
        // Comparación precisa de fechas (sin hora, solo fecha)
        const entryDateStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
        const monthEndDate = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
        
        if (entryDateStart >= monthStartDate && entryDateStart <= monthEndDate) {
          secondMeetingsCount++;
        }
      }

      req.log.debug({
        month,
        year,
        secondMeetingsTotal: secondMeetingByContact.size,
        secondMeetingsInMonth: secondMeetingsCount
      }, 'Second meetings calculated');

      // Nuevos clientes: contar solo la PRIMERA vez que cada contacto entra a "Cliente"

      // Contar solo los que entraron por primera vez en el mes
      let newClientsCount = 0;
      const clientContactIds: string[] = [];
      for (const [contactId, firstEntryDate] of clientByContact.entries()) {
        const entryDate = firstEntryDate instanceof Date ? firstEntryDate : new Date(firstEntryDate);
        // Comparación precisa de fechas (sin hora, solo fecha)
        const entryDateStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
        const monthEndDate = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
        
        if (entryDateStart >= monthStartDate && entryDateStart <= monthEndDate) {
          newClientsCount++;
          clientContactIds.push(contactId);
        }
      }

      req.log.debug({
        month,
        year,
        newClientsTotal: clientByContact.size,
        newClientsInMonth: newClientsCount
      }, 'New clients calculated');

      // Cierres por línea de negocio: contactos que alcanzaron Cliente por primera vez en el mes con etiquetas de esa línea
      // NOTA: Un contacto puede tener múltiples etiquetas de líneas de negocio, en cuyo caso
      // se cuenta en todas las líneas correspondientes (ej: un contacto con etiquetas "inversiones" y "zurich"
      // contará como un cierre en ambas líneas)
      // clientContactIds ya está calculado arriba con la lógica de "primera vez"

      const businessLineClosures = {
        inversiones: 0,
        zurich: 0,
        patrimonial: 0
      };

      if (clientContactIds.length > 0) {
        // Obtener etiquetas de estos contactos que tengan líneas de negocio definidas
        const contactTagsWithBusinessLine = await db()
          .select({
            contactId: contactTags.contactId,
            businessLine: tags.businessLine
          })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(and(
            inArray(contactTags.contactId, clientContactIds),
            eq(tags.scope, 'contact'),
            isNotNull(tags.businessLine),
            inArray(tags.businessLine, ['inversiones', 'zurich', 'patrimonial'])
          ));

        // Contar contactos únicos por línea de negocio usando Set para evitar duplicados
        // Si un contacto tiene múltiples etiquetas de la misma línea, solo cuenta una vez
        const contactsByBusinessLine = new Map<string, Set<string>>();
        for (const row of contactTagsWithBusinessLine) {
          // El filtro SQL ya garantiza que businessLine no es null y tiene un valor válido
          const businessLine = row.businessLine!;
          if (!contactsByBusinessLine.has(businessLine)) {
            contactsByBusinessLine.set(businessLine, new Set());
          }
          contactsByBusinessLine.get(businessLine)!.add(row.contactId);
        }

        businessLineClosures.inversiones = contactsByBusinessLine.get('inversiones')?.size ?? 0;
        businessLineClosures.zurich = contactsByBusinessLine.get('zurich')?.size ?? 0;
        businessLineClosures.patrimonial = contactsByBusinessLine.get('patrimonial')?.size ?? 0;

        req.log.debug({
          month,
          year,
          clientContactsCount: clientContactIds.length,
          contactTagsWithBusinessLineCount: contactTagsWithBusinessLine.length,
          businessLineClosures
        }, 'Business line closures calculated');
      } else {
        req.log.debug({ month, year, clientContactsCount: 0 }, 'No client contacts found for business line closures');
      }

      // Tiempos entre avances - calcular en memoria para simplicidad
      // Primero identificar contactos que tuvieron cambios relevantes en el mes
      const contactsWithChangesInMonth = await db()
        .select({
          contactId: pipelineStageHistory.contactId
        })
        .from(pipelineStageHistory)
        .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
        .where(and(
          inArray(pipelineStageHistory.toStage, [
            firstMeetingStage.id,
            secondMeetingStage.id,
            clienteStage.id
          ]),
          gte(pipelineStageHistory.changedAt, monthStart),
          lte(pipelineStageHistory.changedAt, monthEnd),
          isNull(contacts.deletedAt),
          accessFilter.whereClause
        ))
        .groupBy(pipelineStageHistory.contactId);

      const contactIdsWithChanges = contactsWithChangesInMonth.map((c: { contactId: string }) => c.contactId);

      // AI_DECISION: Paralelizar queries de historial completo y fechas de creación ya que son independientes.
      // Ambas queries dependen de contactIdsWithChanges pero no dependen entre sí.
      const twoYearsAgo = new Date(year, month - 1, 1);
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const [fullHistoryForContacts, contactCreations] = await Promise.all([
        // Obtener TODO el historial de estos contactos (no solo del mes)
        // Limitar a últimos 2 años para optimizar la query
        contactIdsWithChanges.length > 0 ? db()
          .select({
            contactId: pipelineStageHistory.contactId,
            toStage: pipelineStageHistory.toStage,
            changedAt: pipelineStageHistory.changedAt
          })
          .from(pipelineStageHistory)
          .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
          .where(and(
            inArray(pipelineStageHistory.contactId, contactIdsWithChanges),
            inArray(pipelineStageHistory.toStage, [
              prospectoStage?.id,
              firstMeetingStage.id,
              secondMeetingStage.id,
              clienteStage.id
            ].filter((id): id is string => id !== undefined)),
            gte(pipelineStageHistory.changedAt, twoYearsAgo),
            isNull(contacts.deletedAt),
            accessFilter.whereClause
          ))
          .orderBy(asc(pipelineStageHistory.changedAt)) : Promise.resolve([]),

        // Obtener fechas de creación de contactos
        contactIdsWithChanges.length > 0 ? db()
          .select({
            id: contacts.id,
            createdAt: contacts.createdAt
          })
          .from(contacts)
          .where(and(
            inArray(contacts.id, contactIdsWithChanges),
            isNull(contacts.deletedAt),
            accessFilter.whereClause
          )) : Promise.resolve([])
      ]);

      const creationMap = new Map(contactCreations.map((c: { id: string; createdAt: Date }) => [c.id, c.createdAt]));

      // Agrupar historial completo por contacto
      const historyByContact = new Map<string, Array<{ toStage: string; changedAt: Date }>>();
      for (const entry of fullHistoryForContacts) {
        if (!historyByContact.has(entry.contactId)) {
          historyByContact.set(entry.contactId, []);
        }
        historyByContact.get(entry.contactId)!.push({
          toStage: entry.toStage,
          changedAt: entry.changedAt
        });
      }

      // Calcular tiempos promedio solo para transiciones que se completaron en el mes
      const prospectoToFirstTimes: number[] = [];
      const firstToSecondTimes: number[] = [];
      const secondToClientTimes: number[] = [];

      for (const contactId of contactIdsWithChanges) {
        const history = historyByContact.get(contactId);
        if (!history || history.length === 0) continue;

        const sortedHistory = history.sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
        const createdAt = creationMap.get(contactId);

        // Validar integridad de datos: primera entrada no debería ser antes de la creación
        if (createdAt && createdAt instanceof Date && sortedHistory.length > 0) {
          const firstHistoryEntry = sortedHistory[0];
          if (firstHistoryEntry.changedAt < createdAt) {
            req.log.warn({
              contactId,
              firstHistoryDate: firstHistoryEntry.changedAt,
              createdAt,
              difference: createdAt.getTime() - firstHistoryEntry.changedAt.getTime()
            }, 'Data integrity warning: first history entry is before contact creation');
          }
        }

        // Prospecto → Primera reunión: calcular solo si entró a Primera reunión en el mes
        const firstMeetingEntry = sortedHistory.find(h => 
          h.toStage === firstMeetingStage.id &&
          h.changedAt >= monthStart &&
          h.changedAt <= monthEnd
        );
        if (firstMeetingEntry && createdAt && createdAt instanceof Date) {
          const days = (firstMeetingEntry.changedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (days > 0) {
            prospectoToFirstTimes.push(days);
          } else if (days < 0) {
            req.log.warn({
              contactId,
              firstMeetingDate: firstMeetingEntry.changedAt,
              createdAt,
              days
            }, 'Data integrity warning: first meeting entry is before contact creation');
          }
        }

        // Primera reunión → Segunda reunión: calcular solo si entró a Segunda reunión en el mes
        const firstMeetingEntryInHistory = sortedHistory.find(h => h.toStage === firstMeetingStage.id);
        const secondMeetingEntry = sortedHistory.find(h => 
          h.toStage === secondMeetingStage.id &&
          h.changedAt >= monthStart &&
          h.changedAt <= monthEnd
        );
        if (firstMeetingEntryInHistory && secondMeetingEntry) {
          const days = (secondMeetingEntry.changedAt.getTime() - firstMeetingEntryInHistory.changedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (days > 0) {
            firstToSecondTimes.push(days);
          }
        }

        // Segunda reunión → Cliente: calcular solo si entró a Cliente en el mes
        const secondMeetingEntryInHistory = sortedHistory.find(h => h.toStage === secondMeetingStage.id);
        const clientEntry = sortedHistory.find(h => 
          h.toStage === clienteStage.id &&
          h.changedAt >= monthStart &&
          h.changedAt <= monthEnd
        );
        if (secondMeetingEntryInHistory && clientEntry) {
          const days = (clientEntry.changedAt.getTime() - secondMeetingEntryInHistory.changedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (days > 0) {
            secondToClientTimes.push(days);
          }
        }
      }

      const avgProspectoToFirst = prospectoToFirstTimes.length > 0
        ? Math.round(prospectoToFirstTimes.reduce((a, b) => a + b, 0) / prospectoToFirstTimes.length)
        : null;
      const avgFirstToSecond = firstToSecondTimes.length > 0
        ? Math.round(firstToSecondTimes.reduce((a, b) => a + b, 0) / firstToSecondTimes.length)
        : null;
      const avgSecondToClient = secondToClientTimes.length > 0
        ? Math.round(secondToClientTimes.reduce((a, b) => a + b, 0) / secondToClientTimes.length)
        : null;

      req.log.debug({
        month,
        year,
        transitionTimesCounts: {
          prospectoToFirst: prospectoToFirstTimes.length,
          firstToSecond: firstToSecondTimes.length,
          secondToClient: secondToClientTimes.length
        },
        transitionTimesAverages: {
          prospectoToFirst: avgProspectoToFirst,
          firstToSecond: avgFirstToSecond,
          secondToClient: avgSecondToClient
        }
      }, 'Transition times calculated');

      const metrics = {
        month,
        year,
        newProspects: newContactsCount, // Mantener nombre de campo para compatibilidad, pero ahora cuenta "Contactado"
        firstMeetings: firstMeetingsCount,
        secondMeetings: secondMeetingsCount,
        newClients: newClientsCount,
        businessLineClosures,
        transitionTimes: {
          prospectoToFirstMeeting: avgProspectoToFirst,
          firstToSecondMeeting: avgFirstToSecond,
          secondMeetingToClient: avgSecondToClient
        }
      };

      req.log.info({ month, year, metrics }, 'Monthly metrics calculated successfully');
      return metrics;
    };

    // Calcular métricas del mes actual
    const currentMonthMetrics = await calculateMonthlyMetrics(targetMonth, targetYear);

    // Calcular historial: todos los meses con datos disponibles
    const allHistoryEntries = await db()
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${pipelineStageHistory.changedAt})::int`,
        year: sql<number>`EXTRACT(YEAR FROM ${pipelineStageHistory.changedAt})::int`
      })
      .from(pipelineStageHistory)
      .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
      .where(and(
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      ))
      .groupBy(
        sql`EXTRACT(MONTH FROM ${pipelineStageHistory.changedAt})`,
        sql`EXTRACT(YEAR FROM ${pipelineStageHistory.changedAt})`
      )
      .orderBy(
        desc(sql`EXTRACT(YEAR FROM ${pipelineStageHistory.changedAt})`),
        desc(sql`EXTRACT(MONTH FROM ${pipelineStageHistory.changedAt})`)
      );

    // También incluir meses con contactos creados
    const contactCreationMonths = await db()
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${contacts.createdAt})::int`,
        year: sql<number>`EXTRACT(YEAR FROM ${contacts.createdAt})::int`
      })
      .from(contacts)
      .where(and(
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      ))
      .groupBy(
        sql`EXTRACT(MONTH FROM ${contacts.createdAt})`,
        sql`EXTRACT(YEAR FROM ${contacts.createdAt})`
      );

    // Combinar y deduplicar meses
    const allMonths = new Set<string>();
    for (const entry of allHistoryEntries) {
      allMonths.add(`${entry.year}-${entry.month}`);
    }
    for (const entry of contactCreationMonths) {
      allMonths.add(`${entry.year}-${entry.month}`);
    }

    // AI_DECISION: Excluir mes actual del historial para evitar cálculo duplicado.
    // El mes actual ya se calcula como currentMonthMetrics, no necesita calcularse otra vez en historyMetrics.
    // Esto elimina queries redundantes y logs duplicados.
    const currentMonthKey = `${targetYear}-${targetMonth}`;
    allMonths.delete(currentMonthKey);

    // Calcular métricas para cada mes en paralelo (excluyendo mes actual)
    const monthPromises = Array.from(allMonths)
      .sort()
      .reverse()
      .map(async (monthKey) => {
        const [year, month] = monthKey.split('-').map(Number);
        if (year && month) {
          return await calculateMonthlyMetrics(month, year);
        }
        return null;
      });
    
    const historyMetrics = (await Promise.all(monthPromises)).filter((m): m is Awaited<ReturnType<typeof calculateMonthlyMetrics>> => m !== null);

    res.json({
      success: true,
      data: {
        currentMonth: currentMonthMetrics,
        history: historyMetrics
      }
    });
  } catch (err) {
    req.log.error({ err }, 'failed to get contacts metrics');
    next(err);
  }
});

export default router;

