/**
 * Handler para listar instrumentos disponibles para benchmarks
 *
 * AI_DECISION: Extraer handler de instrumentos a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request } from 'express';
import { db } from '@maatwork/db';
import { instruments, lookupAssetClass } from '@maatwork/db/schema';
import { eq, asc } from 'drizzle-orm';
import { createRouteHandler } from '../../../utils/route-handler';

/**
 * GET /benchmarks/instruments/available
 * Listar instrumentos disponibles para agregar a benchmarks
 */
export const handleAvailableInstruments = createRouteHandler(async (req: Request) => {
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

  return instrumentsList;
});
