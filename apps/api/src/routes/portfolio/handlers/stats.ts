/**
 * Handlers para estadísticas de Portfolio
 */

import type { Request } from 'express';
import { db } from '@maatwork/db';
import { clientPortfolioAssignments, portfolios } from '@maatwork/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { createDrizzleLogger } from '../../../utils/database/db-logger';
import { calculateTotalWeight, isValidTotalWeight } from '../../../utils/portfolio-utils';
import { getPortfolioLines } from '../../../services/portfolio-service';
import { HttpError } from '../../../utils/route-handler';

/**
 * GET /portfolios/:id/stats
 * Obtener estadísticas detalladas del portfolio
 */
export async function getPortfolioStats(req: Request) {
  const portfolioId = req.params.id;
  const dbLogger = createDrizzleLogger(req.log);
  
  // 1. Get lines with metadata
  const lines = await getPortfolioLines(portfolioId, { includeMetadata: true });
  
  if (lines.length === 0) {
    // Check if portfolio exists
    const [portfolioExists] = await db()
      .select({ id: portfolios.id })
      .from(portfolios)
      .where(eq(portfolios.id, portfolioId))
      .limit(1);
    
    if (!portfolioExists) {
      throw new HttpError(404, 'Portfolio no encontrado');
    }
  }

  // 2. Count active Assignments
  const assignmentsCountResult = await dbLogger.select<{ count: number }[]>('count_assignments', () => 
    db()
      .select({ count: sql<number>`count(*)::int` })
      .from(clientPortfolioAssignments)
      .where(and(
        eq(clientPortfolioAssignments.portfolioId, portfolioId),
        eq(clientPortfolioAssignments.status, 'active')
      ))
  );
  
  const activeAssignments = assignmentsCountResult[0]?.count ?? 0;

  // 3. Calculate Stats
  const totalWeight = calculateTotalWeight(lines);
  const isValid = isValidTotalWeight(totalWeight);
  
  // Distribution by Asset Class
  const distribution: Record<string, number> = {};
  let unassignedWeight = 0;
  
  lines.forEach(line => {
    const key = line.assetClassName || 'Sin Clasificar';
    const weight = Number(line.targetWeight);
    
    if (line.assetClassName) {
      distribution[key] = (distribution[key] || 0) + weight;
    } else {
      unassignedWeight += weight;
    }
  });
  
  if (unassignedWeight > 0) {
    distribution['Sin Clasificar'] = unassignedWeight;
  }

  // Distribution by Type
  const typeDistribution = {
    instrument: lines.filter(l => l.targetType === 'instrument').reduce((acc, l) => acc + Number(l.targetWeight), 0),
    assetClass: lines.filter(l => l.targetType === 'assetClass').reduce((acc, l) => acc + Number(l.targetWeight), 0),
  };

  return {
    overview: {
      totalWeight,
      isValid,
      itemsCount: lines.length,
      activeAssignments,
    },
    distribution: {
      byAssetClass: distribution,
      byType: typeDistribution,
    },
    flags: {
      hasUnassignedAssets: unassignedWeight > 0,
      isOverweight: totalWeight > 1.0001,
      isUnderweight: totalWeight < 0.9999,
    }
  };
}


