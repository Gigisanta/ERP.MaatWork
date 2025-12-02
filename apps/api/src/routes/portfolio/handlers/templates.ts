/**
 * Handlers para Portfolio Templates CRUD
 */

import { Request, Response } from 'express';
import { db } from '@cactus/db';
import {
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  instruments,
  lookupAssetClass,
} from '@cactus/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { createDrizzleLogger, createOperationName } from '../../../utils/db-logger';
import { calculateTotalWeight, isValidTotalWeight } from '../../../utils/portfolio-utils';
import { getPortfolioTemplateLines } from '../../../services/portfolio-service';

/**
 * GET /portfolios/templates
 * Listar plantillas de carteras con conteo de clientes asignados
 */
export async function listTemplates(req: Request, res: Response) {
  try {
    const dbLogger = createDrizzleLogger(req.log);

    const templates = await dbLogger.select('get_portfolio_templates', () =>
      db()
        .select({
          id: portfolioTemplates.id,
          name: portfolioTemplates.name,
          description: portfolioTemplates.description,
          riskLevel: portfolioTemplates.riskLevel,
          createdAt: portfolioTemplates.createdAt,
          clientCount: sql<number>`COALESCE(COUNT(DISTINCT ${clientPortfolioAssignments.id}) FILTER (WHERE ${clientPortfolioAssignments.status} = 'active'), 0)`,
        })
        .from(portfolioTemplates)
        .leftJoin(
          clientPortfolioAssignments,
          eq(portfolioTemplates.id, clientPortfolioAssignments.templateId)
        )
        .groupBy(
          portfolioTemplates.id,
          portfolioTemplates.name,
          portfolioTemplates.description,
          portfolioTemplates.riskLevel,
          portfolioTemplates.createdAt
        )
        .orderBy(desc(portfolioTemplates.createdAt))
    );

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching portfolio templates');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /portfolios/templates
 * Crear nueva plantilla de cartera
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = req.user?.id!;
    const { name, description, riskLevel } = req.body;

    const [template] = await db()
      .insert(portfolioTemplates)
      .values({
        name,
        description,
        riskLevel,
        createdByUserId: userId,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error creating portfolio template');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /portfolios/templates/:id
 * Obtener plantilla de cartera por ID con líneas
 */
export async function getTemplateById(req: Request, res: Response) {
  try {
    const templateId = req.params.id;
    const dbLogger = createDrizzleLogger(req.log);

    const operationName = createOperationName('get_portfolio_template', templateId);
    const linesOperationName = createOperationName('get_portfolio_template_lines', templateId);

    const [templateResult, lines] = await Promise.all([
      dbLogger.select(operationName, () =>
        db()
          .select({
            id: portfolioTemplates.id,
            name: portfolioTemplates.name,
            description: portfolioTemplates.description,
            riskLevel: portfolioTemplates.riskLevel,
            createdAt: portfolioTemplates.createdAt,
          })
          .from(portfolioTemplates)
          .where(eq(portfolioTemplates.id, templateId))
          .limit(1)
      ),
      dbLogger.select(linesOperationName, () => getPortfolioTemplateLines(templateId)),
    ]);

    const [template] = Array.isArray(templateResult) ? templateResult : [];

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const totalWeight = calculateTotalWeight(lines);
    const isValid = isValidTotalWeight(totalWeight);

    res.json({
      success: true,
      data: {
        ...template,
        lines,
        totalWeight,
        isValid,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching portfolio template by ID');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /portfolios/templates/:id
 * Actualizar plantilla de cartera
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const templateId = req.params.id;
    const { name, description, riskLevel } = req.body;

    const [updatedTemplate] = await db()
      .update(portfolioTemplates)
      .set({
        name,
        description,
        riskLevel,
      })
      .where(eq(portfolioTemplates.id, templateId))
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json({
      success: true,
      data: updatedTemplate,
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error updating portfolio template');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /portfolios/templates/lines/batch
 * Obtener líneas de múltiples plantillas (batch)
 */
export async function getTemplateLinesBatch(req: Request, res: Response) {
  try {
    const { validateBatchIds, BATCH_LIMITS } = await import('../../../utils/batch-validation');

    const validation = validateBatchIds(req.query.ids as string, {
      maxCount: BATCH_LIMITS.MAX_PORTFOLIOS,
      requireUuid: true,
      fieldName: 'ids',
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid batch request',
        details: validation.errors,
      });
    }

    const templateIds = validation.ids;

    if (!templateIds || templateIds.length === 0) {
      return res.json({
        success: true,
        data: {},
      });
    }

    const query = db()
      .select({
        lineId: portfolioTemplateLines.id,
        templateId: portfolioTemplateLines.templateId,
        targetType: portfolioTemplateLines.targetType,
        assetClass: portfolioTemplateLines.assetClass,
        instrumentId: portfolioTemplateLines.instrumentId,
        targetWeight: portfolioTemplateLines.targetWeight,
        instrumentSymbol: instruments.symbol,
        instrumentName: instruments.name,
        assetClassName: lookupAssetClass.label,
      })
      .from(portfolioTemplateLines)
      .leftJoin(instruments, eq(portfolioTemplateLines.instrumentId, instruments.id))
      .leftJoin(lookupAssetClass, eq(portfolioTemplateLines.assetClass, lookupAssetClass.id))
      .where(inArray(portfolioTemplateLines.templateId, templateIds));

    const allLines = await query;

    const linesByTemplate: Record<string, unknown[]> = {};
    templateIds.forEach((id) => {
      linesByTemplate[id] = [];
    });

    type PortfolioLineWithMetadata = {
      lineId: string;
      templateId: string;
      targetType: string;
      assetClass: string | null;
      instrumentId: string | null;
      targetWeight: string | number;
      instrumentSymbol: string | null;
      instrumentName: string | null;
      assetClassName: string | null;
    };

    allLines.forEach((line: PortfolioLineWithMetadata) => {
      if (linesByTemplate[line.templateId]) {
        linesByTemplate[line.templateId].push({
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

    res.json({
      success: true,
      data: linesByTemplate,
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching template lines batch');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
