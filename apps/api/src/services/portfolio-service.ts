import { db } from '@maatwork/db';
import {
  portfolioLines,
  clientPortfolioAssignments,
  instruments,
  lookupAssetClass,
} from '@maatwork/db/schema';
import { eq, asc } from 'drizzle-orm';
import { canAccessContact } from '../auth/authorization';
import type { UserRole } from '../auth/types';

interface PortfolioLine {
  id: string;
  targetType: string;
  assetClass: string | null;
  instrumentId: string | null;
  targetWeight: string | number;
  instrumentName: string | null;
  instrumentSymbol: string | null;
  assetClassName: string | null;
}

interface GetPortfolioLinesOptions {
  includeMetadata?: boolean;
}

/**
 * Obtiene las líneas de un portfolio con metadata de instrumentos y asset classes
 * @param portfolioId - ID del portfolio
 * @param options - Opciones de configuración
 * @returns Array de líneas con metadata
 */
export async function getPortfolioLines(
  portfolioId: string,
  options: GetPortfolioLinesOptions = {}
): Promise<PortfolioLine[]> {
  const { includeMetadata = true } = options;

  let query = db()
    .select({
      id: portfolioLines.id,
      targetType: portfolioLines.targetType,
      assetClass: portfolioLines.assetClass,
      instrumentId: portfolioLines.instrumentId,
      targetWeight: portfolioLines.targetWeight,
      ...(includeMetadata && {
        instrumentName: instruments.name,
        instrumentSymbol: instruments.symbol,
        assetClassName: lookupAssetClass.label,
      }),
    })
    .from(portfolioLines)
    .leftJoin(instruments, eq(portfolioLines.instrumentId, instruments.id))
    .leftJoin(lookupAssetClass, eq(portfolioLines.assetClass, lookupAssetClass.id))
    .where(eq(portfolioLines.portfolioId, portfolioId));

  if (includeMetadata) {
    query = query.orderBy(
      asc(portfolioLines.targetType),
      asc(portfolioLines.targetWeight)
    );
  }

  return query;
}

interface AssignmentWithContact {
  id: string;
  contactId: string;
  portfolioId: string;
}

/**
 * Obtiene una asignación de portfolio y verifica acceso al contacto asociado
 * @param assignmentId - ID de la asignación
 * @param userId - ID del usuario
 * @param role - Rol del usuario
 * @returns Asignación si existe y tiene acceso, null si no
 */
export async function getAssignmentWithAccessCheck(
  assignmentId: string,
  userId: string,
  role: UserRole
): Promise<AssignmentWithContact | null> {
  // Obtener asignación
  const [assignment] = await db()
    .select({
      id: clientPortfolioAssignments.id,
      contactId: clientPortfolioAssignments.contactId,
      portfolioId: clientPortfolioAssignments.portfolioId,
    })
    .from(clientPortfolioAssignments)
    .where(eq(clientPortfolioAssignments.id, assignmentId))
    .limit(1);

  if (!assignment) {
    return null;
  }

  // Verificar acceso al contacto
  const hasAccess = await canAccessContact(userId, role, assignment.contactId);
  if (!hasAccess) {
    return null;
  }

  return assignment;
}
