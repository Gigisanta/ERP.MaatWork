/**
 * Handlers para Portfolios CRUD
 */

import type { Request } from 'express';
import { db } from '@maatwork/db';
import {
  portfolios,
  portfolioLines,
  clientPortfolioAssignments,
  instruments,
  lookupAssetClass,
} from '@maatwork/db/schema';
import { eq, sql, desc, asc, inArray, ilike, and, or } from 'drizzle-orm';
import { createDrizzleLogger, createOperationName } from '../../../utils/database/db-logger';
import { calculateTotalWeight, isValidTotalWeight } from '../../../utils/portfolio-utils';
import { HttpError } from '../../../utils/route-handler';
import { getPortfolioLines } from '../../../services/portfolio-service';
import { listPortfoliosQuerySchema } from '../schemas';
import { invalidateCache } from '../../../middleware/cache';

/**
 * GET /portfolios
 * Listar portfolios con paginación, búsqueda y filtros
 * 
 * Query params:
 * - page: número de página (default: 1)
 * - limit: items por página (default: 50, max: 100)
 * - search: búsqueda por nombre o código
 * - sortBy: campo de ordenamiento (name, createdAt, clientCount, lineCount)
 * - sortOrder: dirección (asc, desc)
 */
export async function listPortfolios(req: Request) {
  const dbLogger = createDrizzleLogger(req.log);
  
  // Parse and validate query params with defaults
  const queryResult = listPortfoliosQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new HttpError(400, `Invalid query parameters: ${queryResult.error.message}`);
  }
  
  const { page, limit, search, sortBy, sortOrder } = queryResult.data;
  const offset = (page - 1) * limit;

  // AI_DECISION: Use subqueries for counts to avoid fan-out performance issues with multiple joins
  // Justificación: Joins with counts on large datasets can cause incorrect results or performance degradation due to row multiplication.
  // Impacto: Stable performance and accurate counts even with high data volume.
  const clientCountSubquery = db()
    .select({
      portfolioId: clientPortfolioAssignments.portfolioId,
      count: sql<number>`count(*)::int`.as('client_count'),
    })
    .from(clientPortfolioAssignments)
    .where(eq(clientPortfolioAssignments.status, 'active'))
    .groupBy(clientPortfolioAssignments.portfolioId)
    .as('cc');

  const lineCountSubquery = db()
    .select({
      portfolioId: portfolioLines.portfolioId,
      count: sql<number>`count(*)::int`.as('line_count'),
    })
    .from(portfolioLines)
    .groupBy(portfolioLines.portfolioId)
    .as('lc');

  // Build WHERE conditions
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [];

  // Exclude soft-deleted portfolios
  conditions.push(sql`${portfolios.deletedAt} IS NULL`);

  // Build base query
  const baseQuery = db()
    .select({
      id: portfolios.id,
      code: portfolios.code,
      name: portfolios.name,
      description: portfolios.description,
      createdAt: portfolios.createdAt,
      clientCount: sql<number>`COALESCE(${clientCountSubquery.count}, 0)`,
      lineCount: sql<number>`COALESCE(${lineCountSubquery.count}, 0)`,
    })
    .from(portfolios)
    .leftJoin(clientCountSubquery, eq(portfolios.id, clientCountSubquery.portfolioId))
    .leftJoin(lineCountSubquery, eq(portfolios.id, lineCountSubquery.portfolioId));

  // Apply search filter (search by name or code)
  let whereClause;
  if (search) {
    const searchPattern = `%${search}%`;
    const searchCondition = or(
      ilike(portfolios.name, searchPattern),
      ilike(portfolios.code, searchPattern)
    );
    whereClause = conditions.length > 0 
      ? and(...conditions, searchCondition)
      : searchCondition;
  } else {
    whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  }

  // Apply sorting
  const orderByColumn = {
    name: portfolios.name,
    createdAt: portfolios.createdAt,
    clientCount: sql`COALESCE(${clientCountSubquery.count}, 0)`,
    lineCount: sql`COALESCE(${lineCountSubquery.count}, 0)`,
  }[sortBy];
  
  const orderDirection = sortOrder === 'asc' ? asc : desc;

  // Execute count query for pagination metadata
  const countQuery = db()
    .select({ count: sql<number>`count(*)::int` })
    .from(portfolios);
  
  if (whereClause) {
    countQuery.where(whereClause);
  }

  // Execute main query with pagination
  let dataQuery = baseQuery;
  if (whereClause) {
    dataQuery = dataQuery.where(whereClause);
  }
  dataQuery = dataQuery
    .orderBy(orderDirection(orderByColumn))
    .limit(limit)
    .offset(offset);

  // Execute both queries in parallel
  const [countResult, data] = await Promise.all([
    dbLogger.select('count_portfolios', () => countQuery) as Promise<{ count: number }[]>,
    dbLogger.select('list_portfolios', () => dataQuery),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * POST /portfolios
 * Crear nuevo portfolio
 */
export async function createPortfolio(req: Request) {
  const userId = req.user!.id;
  const { name, description, code } = req.body;

  const [portfolio] = await db()
    .insert(portfolios)
    .values({
      name,
      description,
      code,
      createdByUserId: userId,
    })
    .returning();

  // Invalidate cache
  await invalidateCache('portfolios:list*');

  return portfolio;
}

/**
 * GET /portfolios/:id
 * Obtener portfolio por ID con líneas
 */
export async function getPortfolioById(req: Request) {
  const portfolioId = req.params.id;
  const dbLogger = createDrizzleLogger(req.log);

  const operationName = createOperationName('get_portfolio', portfolioId);
  const linesOperationName = createOperationName('get_portfolio_lines', portfolioId);

  const [portfolioResult, lines] = await Promise.all([
    dbLogger.select(operationName, () =>
      db()
        .select({
          id: portfolios.id,
          code: portfolios.code,
          name: portfolios.name,
          description: portfolios.description,
          createdAt: portfolios.createdAt,
        })
        .from(portfolios)
        .where(and(
          eq(portfolios.id, portfolioId),
          sql`${portfolios.deletedAt} IS NULL`
        ))
        .limit(1)
    ),
    dbLogger.select(linesOperationName, () => getPortfolioLines(portfolioId)), // Function renaming needed downstream or alias
  ]);

  const [portfolio] = Array.isArray(portfolioResult) ? portfolioResult : [];

  if (!portfolio) {
    throw new HttpError(404, 'Portfolio no encontrado');
  }

  const totalWeight = calculateTotalWeight(lines); // Ensure type compatibility
  const isValid = isValidTotalWeight(totalWeight);

  return {
    ...portfolio,
    lines,
    totalWeight,
    isValid,
  };
}

/**
 * PUT /portfolios/:id
 * Actualizar portfolio
 */
export async function updatePortfolio(req: Request) {
  const portfolioId = req.params.id;
  const { name, description, code } = req.body;

  const [updatedPortfolio] = await db()
    .update(portfolios)
    .set({
      name,
      description,
      code,
    })
    .where(and(
      eq(portfolios.id, portfolioId),
      sql`${portfolios.deletedAt} IS NULL`
    ))
    .returning();

  if (!updatedPortfolio) {
    throw new HttpError(404, 'Portfolio no encontrado');
  }

  if (!updatedPortfolio) {
    throw new HttpError(404, 'Portfolio no encontrado');
  }

  // Invalidate cache
  await invalidateCache('portfolios:list*');
  await invalidateCache(`portfolios:detail:${portfolioId}*`);

  return updatedPortfolio;
}

/**
 * DELETE /portfolios/:id
 * Eliminar portfolio (Soft Delete)
 */
export async function deletePortfolio(req: Request) {
  const portfolioId = req.params.id;

  const [deletedPortfolio] = await db()
    .update(portfolios)
    .set({
      deletedAt: new Date(),
    })
    .where(and(
      eq(portfolios.id, portfolioId),
      // Optional: Ensure not already deleted? Not strictly necessary for idempotency but good for returning 404 if already gone
      sql`${portfolios.deletedAt} IS NULL`
    ))
    .returning();

  if (!deletedPortfolio) {
    throw new HttpError(404, 'Portfolio no encontrado o ya eliminado');
  }

  // Invalidate cache
  await invalidateCache('portfolios:list*');
  await invalidateCache(`portfolios:detail:${portfolioId}*`);

  return { success: true };
}

/**
 * GET /portfolios/lines/batch
 * Obtener líneas de múltiples portfolios (batch)
 */
export async function getPortfolioLinesBatch(req: Request) {
  const { validateBatchIds, BATCH_LIMITS } =
    await import('../../../utils/database/batch-validation');

  const validation = validateBatchIds(req.query.ids as string, {
    maxCount: BATCH_LIMITS.MAX_PORTFOLIOS,
    requireUuid: true,
    fieldName: 'ids',
  });

  if (!validation.valid) {
    const errorMessage = validation.errors?.join(', ') || 'Invalid batch request';
    throw new HttpError(400, `Invalid batch request: ${errorMessage}`);
  }

  const portfolioIds = validation.ids;

  if (!portfolioIds || portfolioIds.length === 0) {
    return {};
  }

  const query = db()
    .select({
      lineId: portfolioLines.id,
      portfolioId: portfolioLines.portfolioId,
      targetType: portfolioLines.targetType,
      assetClass: portfolioLines.assetClass,
      instrumentId: portfolioLines.instrumentId,
      targetWeight: portfolioLines.targetWeight,
      instrumentSymbol: instruments.symbol,
      instrumentName: instruments.name,
      assetClassName: lookupAssetClass.label,
    })
    .from(portfolioLines)
    .leftJoin(instruments, eq(portfolioLines.instrumentId, instruments.id))
    .leftJoin(lookupAssetClass, eq(portfolioLines.assetClass, lookupAssetClass.id))
    .where(inArray(portfolioLines.portfolioId, portfolioIds));

  const allLines = await query;

  const linesByPortfolio: Record<string, unknown[]> = {};
  portfolioIds.forEach((id) => {
    linesByPortfolio[id] = [];
  });

  type PortfolioLineWithMetadata = {
    lineId: string;
    portfolioId: string;
    targetType: string;
    assetClass: string | null;
    instrumentId: string | null;
    targetWeight: string | number;
    instrumentSymbol: string | null;
    instrumentName: string | null;
    assetClassName: string | null;
  };

  allLines.forEach((line: PortfolioLineWithMetadata) => {
    if (linesByPortfolio[line.portfolioId]) {
      linesByPortfolio[line.portfolioId].push({
        id: line.lineId,
        targetType: line.targetType,
        assetClass: line.assetClass,
        instrumentId: line.instrumentId,
        targetWeight: line.targetWeight,
        instrumentSymbol: line.instrumentSymbol,
        instrumentName: line.instrumentName,
        assetClassName: line.assetClassName,
      });
    }
  });

  return linesByPortfolio;
}
