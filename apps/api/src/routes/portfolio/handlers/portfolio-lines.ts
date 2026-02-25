/**
 * Handlers para Portfolio Lines
 */

import type { Request } from 'express';
import { db } from '@maatwork/db';
import { portfolioLines } from '@maatwork/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateTotalWeight, isValidTotalWeight } from '../../../utils/portfolio-utils';
import { getPortfolioLines as getPortfolioLinesService } from '../../../services/portfolio-service';
import { HttpError } from '../../../utils/route-handler';

/**
 * GET /portfolios/:id/lines
 * Obtener composición de un portfolio
 */
export async function getPortfolioLines(req: Request) {
  const portfolioId = req.params.id;

  const lines = await getPortfolioLinesService(portfolioId);

  const totalWeight = calculateTotalWeight(lines);

  return {
    lines,
    totalWeight,
    isValid: isValidTotalWeight(totalWeight),
  };
}

/**
 * POST /portfolios/:id/lines
 * Agregar línea a portfolio con validación estricta y transacciones
 */
export async function addPortfolioLine(req: Request) {
  const portfolioId = req.params.id;
  const { targetType, assetClass, instrumentId, targetWeight } = req.body;
  const weight = Number(targetWeight);

  return await db().transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Verificar que la suma de pesos no exceda 1.0 (uso intenso: locks)
    const existingLines = await tx
      .select({ targetWeight: portfolioLines.targetWeight })
      .from(portfolioLines)
      .where(eq(portfolioLines.portfolioId, portfolioId))
      .for('update'); // Lock rows to prevent race conditions in high-concurrency environments

    const currentTotal = calculateTotalWeight(existingLines);
    if (currentTotal + weight > 1.0001) { // Apply small epsilon for float precision
      throw new HttpError(
        400,
        `La suma de pesos excedería 100%. Peso actual: ${(currentTotal * 100).toFixed(2)}%, nuevo peso: ${(weight * 100).toFixed(2)}%`
      );
    }

    const [line] = await tx
      .insert(portfolioLines)
      .values({
        portfolioId,
        targetType,
        assetClass,
        instrumentId,
        targetWeight: weight,
      })
      .returning();

    return line;
  });
}

/**
 * DELETE /portfolios/:id/lines/:lineId
 * Eliminar línea de portfolio
 */
export async function deletePortfolioLine(req: Request) {
  const { id: portfolioId, lineId } = req.params;

  await db()
    .delete(portfolioLines)
    .where(
      and(eq(portfolioLines.id, lineId), eq(portfolioLines.portfolioId, portfolioId))
    );

  return { message: 'Línea eliminada correctamente' };
}
