/**
 * Handler para listar instrumentos disponibles para benchmarks
 *
 * AI_DECISION: Extraer handler de instrumentos a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { db } from '@cactus/db';
import { instruments, lookupAssetClass } from '@cactus/db/schema';
import { eq, asc } from 'drizzle-orm';
import { UserRole } from '../../../auth/types';

/**
 * GET /benchmarks/instruments/available
 * Listar instrumentos disponibles para agregar a benchmarks
 */
export async function handleAvailableInstruments(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const instrumentsList = await db()
      .select({
        id: instruments.id,
        symbol: instruments.symbol,
        name: instruments.name,
        assetClass: instruments.assetClass,
        currency: instruments.currency,
        active: instruments.active,
        assetClassName: lookupAssetClass.label,
      })
      .from(instruments)
      .leftJoin(lookupAssetClass, eq(instruments.assetClass, lookupAssetClass.id))
      .where(eq(instruments.active, true))
      .orderBy(asc(instruments.assetClass), asc(instruments.name));

    res.json({
      success: true,
      data: instrumentsList,
    });
  } catch (error) {
    req.log.error({ error }, 'Error fetching available instruments');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
