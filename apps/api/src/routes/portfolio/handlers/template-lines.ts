/**
 * Handlers para Portfolio Template Lines
 */

import type { Request } from 'express';
import { db } from '@maatwork/db';
import { portfolioTemplateLines } from '@maatwork/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateTotalWeight, isValidTotalWeight } from '../../../utils/portfolio-utils';
import { getPortfolioTemplateLines } from '../../../services/portfolio-service';
import { HttpError } from '../../../utils/route-handler';

/**
 * GET /portfolios/templates/:id/lines
 * Obtener composición de una plantilla
 */
export async function getTemplateLines(req: Request) {
  const templateId = req.params.id;

  const lines = await getPortfolioTemplateLines(templateId);

  const totalWeight = calculateTotalWeight(lines);

  return {
    lines,
    totalWeight,
    isValid: isValidTotalWeight(totalWeight),
  };
}

/**
 * POST /portfolios/templates/:id/lines
 * Agregar línea a plantilla
 */
export async function addTemplateLine(req: Request) {
  const templateId = req.params.id;
  const { targetType, assetClass, instrumentId, targetWeight } = req.body;
  const weight = Number(targetWeight);

  // Verificar que la suma de pesos no exceda 1.0
  const existingLines = await db()
    .select({ targetWeight: portfolioTemplateLines.targetWeight })
    .from(portfolioTemplateLines)
    .where(eq(portfolioTemplateLines.templateId, templateId));

  const currentTotal = calculateTotalWeight(existingLines);
  if (currentTotal + weight > 1.0) {
    throw new HttpError(
      400,
      `La suma de pesos excedería 100%. Peso actual: ${(currentTotal * 100).toFixed(2)}%, nuevo peso: ${(weight * 100).toFixed(2)}%`
    );
  }

  const [line] = await db()
    .insert(portfolioTemplateLines)
    .values({
      templateId,
      targetType,
      assetClass,
      instrumentId,
      targetWeight: weight,
    })
    .returning();

  return line;
}

/**
 * DELETE /portfolios/templates/:id/lines/:lineId
 * Eliminar línea de plantilla
 */
export async function deleteTemplateLine(req: Request) {
  const { id: templateId, lineId } = req.params;

  await db()
    .delete(portfolioTemplateLines)
    .where(
      and(eq(portfolioTemplateLines.id, lineId), eq(portfolioTemplateLines.templateId, templateId))
    );

  return { message: 'Línea eliminada correctamente' };
}
