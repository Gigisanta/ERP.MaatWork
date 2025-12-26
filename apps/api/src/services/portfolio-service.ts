import { db } from '@maatwork/db';
import {
  portfolioTemplateLines,
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
 * Obtiene las líneas de un template de portfolio con metadata de instrumentos y asset classes
 * @param templateId - ID del template
 * @param options - Opciones de configuración
 * @returns Array de líneas con metadata
 */
export async function getPortfolioTemplateLines(
  templateId: string,
  options: GetPortfolioLinesOptions = {}
): Promise<PortfolioLine[]> {
  const { includeMetadata = true } = options;

  let query = db()
    .select({
      id: portfolioTemplateLines.id,
      targetType: portfolioTemplateLines.targetType,
      assetClass: portfolioTemplateLines.assetClass,
      instrumentId: portfolioTemplateLines.instrumentId,
      targetWeight: portfolioTemplateLines.targetWeight,
      ...(includeMetadata && {
        instrumentName: instruments.name,
        instrumentSymbol: instruments.symbol,
        assetClassName: lookupAssetClass.label,
      }),
    })
    .from(portfolioTemplateLines)
    .leftJoin(instruments, eq(portfolioTemplateLines.instrumentId, instruments.id))
    .leftJoin(lookupAssetClass, eq(portfolioTemplateLines.assetClass, lookupAssetClass.id))
    .where(eq(portfolioTemplateLines.templateId, templateId));

  if (includeMetadata) {
    query = query.orderBy(
      asc(portfolioTemplateLines.targetType),
      asc(portfolioTemplateLines.targetWeight)
    );
  }

  return query;
}

interface AssignmentWithContact {
  id: string;
  contactId: string;
  templateId: string;
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
      templateId: clientPortfolioAssignments.templateId,
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
