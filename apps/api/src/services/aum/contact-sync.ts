import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { contacts, type aumImportRows } from '@maatwork/db';
import { eq, inArray, isNull, and } from 'drizzle-orm';
import type { Logger } from 'pino';

/**
 * Sincroniza la asignación de asesores desde filas AUM hacia Contactos.
 *
 * Estrategia:
 * 1. Identificar filas AUM que tienen matchedContactId y matchedUserId (asesor).
 * 2. Buscar los contactos correspondientes que NO tienen asesor asignado.
 * 3. Actualizar esos contactos asignándoles el asesor de la fila AUM.
 *
 * @param tx - Transacción de base de datos
 * @param rows - Filas de AUM a procesar
 * @param log - Logger opcional
 * @returns Estadísticas de sincronización
 */
export async function syncContactAdvisorsFromAumRows(
  tx: NodePgDatabase<Record<string, never>>,
  rows: (typeof aumImportRows.$inferSelect)[],
  log?: Logger
) {
  let syncedCount = 0;
  let skippedCount = 0;

  // Filtrar filas relevantes: tienen contacto y asesor asignado en AUM
  const relevantRows = rows.filter((r) => r.matchedContactId && r.matchedUserId);

  if (relevantRows.length === 0) {
    return { syncedCount, skippedCount };
  }

  // Obtener IDs de contactos únicos
  const contactIds = [...new Set(relevantRows.map((r) => r.matchedContactId!))];

  // Buscar contactos que NO tienen asesor asignado
  // AI_DECISION: Solo actualizar contactos sin asesor ("orphan")
  // Justificación: Evitar sobrescribir asignaciones manuales o previas en CRM.
  // La fuente de verdad para cambios de asesor debería ser explícita, no implícita por carga de AUM.
  const orphanContacts = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(inArray(contacts.id, contactIds), isNull(contacts.assignedAdvisorId)));

  const orphanContactIds = new Set(orphanContacts.map((c) => c.id));

  for (const row of relevantRows) {
    // Si el contacto es "orphan" (sin asesor), lo actualizamos
    if (orphanContactIds.has(row.matchedContactId!)) {
      await tx
        .update(contacts)
        .set({
          assignedAdvisorId: row.matchedUserId,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, row.matchedContactId!));

      syncedCount++;
      // Removemos del Set para evitar re-procesar (aunque no debería pasar si rows son únicos por cuenta)
      orphanContactIds.delete(row.matchedContactId!);

      log?.info(
        { contactId: row.matchedContactId, advisorId: row.matchedUserId, rowId: row.id },
        'Contact advisor synced from AUM row'
      );
    } else {
      skippedCount++;
    }
  }

  return { syncedCount, skippedCount };
}








