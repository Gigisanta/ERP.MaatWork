/**
 * Handlers para Portfolio Template Lines
 */

import { Request, Response } from 'express';
import { db } from '@cactus/db';
import { portfolioTemplateLines } from '@cactus/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateTotalWeight, isValidTotalWeight } from '../../../utils/portfolio-utils';
import { getPortfolioTemplateLines } from '../../../services/portfolio-service';

/**
 * GET /portfolios/templates/:id/lines
 * Obtener composición de una plantilla
 */
export async function getTemplateLines(req: Request, res: Response) {
  try {
    const templateId = req.params.id;

    const lines = await getPortfolioTemplateLines(templateId);

    const totalWeight = calculateTotalWeight(lines);

    res.json({
      success: true,
      data: {
        lines,
        totalWeight,
        isValid: isValidTotalWeight(totalWeight),
      },
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching portfolio template lines');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /portfolios/templates/:id/lines
 * Agregar línea a plantilla
 */
export async function addTemplateLine(req: Request, res: Response) {
  try {
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
      return res.status(400).json({
        error: `La suma de pesos excedería 100%. Peso actual: ${(currentTotal * 100).toFixed(2)}%, nuevo peso: ${(weight * 100).toFixed(2)}%`,
      });
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

    res.status(201).json({
      success: true,
      data: line,
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error adding portfolio template line');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * DELETE /portfolios/templates/:id/lines/:lineId
 * Eliminar línea de plantilla
 */
export async function deleteTemplateLine(req: Request, res: Response) {
  try {
    const { id: templateId, lineId } = req.params;

    await db()
      .delete(portfolioTemplateLines)
      .where(
        and(
          eq(portfolioTemplateLines.id, lineId),
          eq(portfolioTemplateLines.templateId, templateId)
        )
      );

    res.json({
      success: true,
      message: 'Línea eliminada correctamente',
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error deleting portfolio template line');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
