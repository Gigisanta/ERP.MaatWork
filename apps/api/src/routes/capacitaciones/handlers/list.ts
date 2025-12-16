/**
 * Capacitaciones List Handlers
 *
 * GET /capacitaciones - List capacitaciones with filters and pagination
 */
import type { Request } from 'express';
import { db, capacitaciones } from '@cactus/db';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import { createRouteHandler } from '../../../utils/route-handler';
import { parsePaginationParams, formatPaginatedResponse } from '../../../utils/pagination';
import { listCapacitacionesQuerySchema } from '../schemas';

export const handleListCapacitaciones = createRouteHandler(async (req: Request) => {
  const { tema, search } = req.query as {
    tema?: string;
    search?: string;
  };
  const pagination = parsePaginationParams(req.query);
  const { limit, offset } = pagination;

  const conditions = [];

  if (tema) {
    conditions.push(eq(capacitaciones.tema, tema));
  }

  if (search) {
    conditions.push(ilike(capacitaciones.titulo, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // AI_DECISION: Optimize COUNT query using window function
  const result = await db()
    .select({
      id: capacitaciones.id,
      titulo: capacitaciones.titulo,
      tema: capacitaciones.tema,
      link: capacitaciones.link,
      fecha: capacitaciones.fecha,
      createdByUserId: capacitaciones.createdByUserId,
      createdAt: capacitaciones.createdAt,
      updatedAt: capacitaciones.updatedAt,
      total: sql<number>`count(*) OVER()`.as('total'),
    })
    .from(capacitaciones)
    .where(whereClause)
    .orderBy(desc(capacitaciones.createdAt))
    .limit(limit)
    .offset(offset);

  type CapacitacionWithTotal = (typeof result)[0] & { total: number };
  const data = result.map(({ total: _total, ...row }: CapacitacionWithTotal) => row);
  const total: number = result.length > 0 ? Number(result[0]?.total) : 0;

  req.log?.info?.({ count: data.length, total, tema, search }, 'capacitaciones fetched');

  return formatPaginatedResponse(data, total, pagination);
});
