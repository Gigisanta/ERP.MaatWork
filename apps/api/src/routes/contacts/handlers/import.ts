/**
 * Contact Import Handler
 *
 * AI_DECISION: Modularizar endpoint de importación masiva de contactos
 * Justificación: El proceso de importación es complejo, requiere parsing de CSV, matcheo de asesores y deduplicación
 * Impacto: Facilita el mantenimiento, testing y escalabilidad de la importación
 */

import { Request } from 'express';
import { createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { db, contacts, users, advisorAliases } from '@maatwork/db';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { promises as fs } from 'node:fs';
import { matchAdvisor } from '../../../services/aum';
import { normalizeAdvisorAlias } from '../../../utils/aum/aum-normalization';

interface ImportStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  unknownAdvisors: string[];
}

/**
 * Parsea el nombre completo del formato "APELLIDO NOMBRE" o "APELLIDO, NOMBRE"
 * a un objeto con firstName y lastName.
 */
function parseFullName(fullNameRaw: string): { firstName: string; lastName: string } {
  const cleanName = fullNameRaw.trim();

  // Caso "APELLIDO, NOMBRE"
  if (cleanName.includes(',')) {
    const [last, ...rest] = cleanName.split(',');
    return {
      lastName: last.trim(),
      firstName: rest.join(',').trim() || 'Importado',
    };
  }

  // Caso "APELLIDO NOMBRE" (asumimos que el primer espacio separa el primer apellido si no hay coma)
  // O mejor, intentamos detectar si hay más de 2 palabras
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2) {
    return {
      lastName: parts[0],
      firstName: parts.slice(1).join(' '),
    };
  }

  return {
    lastName: cleanName,
    firstName: 'Importado',
  };
}

/**
 * POST /contacts/import
 * Importa contactos desde un archivo CSV (formato Balanz AUM)
 */
export const handleImport = createAsyncHandler(async (req: Request, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== 'admin') {
    throw new HttpError(403, 'Solo los administradores pueden realizar importaciones masivas');
  }

  const file = (req as { file?: Express.Multer.File }).file;
  if (!file) {
    throw new HttpError(400, 'No se ha subido ningún archivo');
  }

  req.log.info(
    { filename: file.originalname, size: file.size },
    'Iniciando importación de contactos'
  );

  let content: string;
  try {
    content = await fs.readFile(file.path, 'utf-8');
  } catch (err) {
    req.log.error({ err }, 'Error leyendo archivo de importación');
    throw new HttpError(500, 'Error al leer el archivo subido');
  }

  const { parse } = await import('csv-parse/sync');
  interface ImportRecord {
    idCuenta?: string;
    idcuenta?: string;
    Descripcion?: string;
    descripcion?: string;
    Asesor?: string;
    asesor?: string;
    comitente?: string;
    [key: string]: string | undefined;
  }
  let records: ImportRecord[];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    req.log.error({ err }, 'Error parseando CSV');
    throw new HttpError(400, 'El formato del archivo CSV es inválido');
  }

  const stats: ImportStats = {
    total: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    unknownAdvisors: [],
  };

  // Pre-cargar mapeo de asesores para evitar N+1
  const advisorMap = new Map<string, string>(); // alias_normalized -> userId

  // 1. Cargar alias existentes
  const aliases = await db().select().from(advisorAliases);
  aliases.forEach((a: typeof advisorAliases.$inferSelect) =>
    advisorMap.set(a.aliasNormalized, a.userId)
  );

  // 2. Cargar asesores por nombre completo (como fallback)
  const allAdvisors = await db()
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.role, 'advisor'), eq(users.isActive, true)));

  const advisorNameMap = new Map<string, string>();
  allAdvisors.forEach((a: { id: string; fullName: string | null }) => {
    if (a.fullName) {
      const normalized = normalizeAdvisorAlias(a.fullName);
      advisorNameMap.set(normalized, a.id);
    }
  });

  const dbi = db();

  for (const record of records) {
    try {
      const idCuenta = record.idCuenta || record.idcuenta;
      const descripcion = record.Descripcion || record.descripcion;
      const asesorRaw = record.Asesor || record.asesor;

      if (!idCuenta || !descripcion) {
        stats.skipped++;
        continue;
      }

      // 1. Identificar Asesor
      let assignedAdvisorId: string | null = null;
      if (asesorRaw) {
        const normalizedAsesor = normalizeAdvisorAlias(asesorRaw);
        assignedAdvisorId =
          advisorMap.get(normalizedAsesor) || advisorNameMap.get(normalizedAsesor) || null;

        if (!assignedAdvisorId && !stats.unknownAdvisors.includes(asesorRaw)) {
          stats.unknownAdvisors.push(asesorRaw);
        }
      }

      // 2. Verificar duplicado por idCuenta en customFields
      const [existingContact] = await dbi
        .select()
        .from(contacts)
        .where(
          and(sql`${contacts.customFields}->>'idCuenta' = ${idCuenta}`, isNull(contacts.deletedAt))
        )
        .limit(1);

      if (existingContact) {
        // Opcional: Actualizar si el asesor cambió o si faltaba
        if (!existingContact.assignedAdvisorId && assignedAdvisorId) {
          await dbi
            .update(contacts)
            .set({
              assignedAdvisorId,
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existingContact.id));
          stats.updated++;
        } else {
          stats.skipped++;
        }
        continue;
      }

      // 3. Parsear nombre
      const { firstName, lastName } = parseFullName(descripcion);

      // 4. Crear contacto
      await dbi.insert(contacts).values({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        assignedAdvisorId,
        source: 'Importación Balanz 2025',
        customFields: {
          idCuenta,
          comitente: record.comitente || null,
          originalDescription: descripcion,
          originalAdvisor: asesorRaw,
        },
      });

      stats.created++;
    } catch (err) {
      req.log.error({ err, record }, 'Error importando fila de contacto');
      stats.errors++;
    }
  }

  // Limpiar archivo temporal
  try {
    await fs.unlink(file.path);
  } catch (err) {
    req.log.warn({ err, path: file.path }, 'Error eliminando archivo temporal tras importación');
  }

  return res.json({
    success: true,
    data: {
      stats,
      message: `Importación completada: ${stats.created} creados, ${stats.updated} actualizados, ${stats.skipped} omitidos, ${stats.errors} errores.`,
    },
  });
});
