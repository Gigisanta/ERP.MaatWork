import {
  db,
  contactTags,
  contacts,
  tags,
  careerPlanLevels,
  users,
  teamMembership,
  teams,
} from '@maatwork/db';
import { eq, and, isNotNull, sql, inArray } from 'drizzle-orm';
import type { CareerPlanLevel, UserCareerProgress, UserRole } from '@maatwork/types';
import {
  calculateProgressPercentage,
  determineLevelFromProduction,
  getNextLevel,
} from '@maatwork/utils';

// Re-export utility functions for local tests
export { calculateProgressPercentage, getNextLevel };

/**
 * Wrapper for determineLevelFromProduction for backwards compatibility with tests
 */
export async function determineUserLevel(
  annualProduction: number,
  levels: CareerPlanLevel[]
): Promise<CareerPlanLevel | null> {
  return determineLevelFromProduction(annualProduction, levels);
}

/**
 * Calcula la producción anual estimada de un usuario
 * Suma todas las primas mensuales de contactos con tags Zurich asignados al usuario
 * Para managers, incluye contactos de miembros del equipo
 * Multiplica por 12 para obtener producción anual estimada
 */
export async function calculateUserAnnualProduction(
  userId: string,
  userRole?: UserRole
): Promise<number> {
  const dbi = db();

  let advisorIds: string[] = [userId];

  // Si es manager, incluir contactos de miembros del equipo
  if (userRole === 'manager') {
    try {
      const teamMembers = await dbi
        .select({ id: users.id })
        .from(users)
        .innerJoin(teamMembership, eq(users.id, teamMembership.userId))
        .innerJoin(teams, eq(teamMembership.teamId, teams.id))
        .where(eq(teams.managerUserId, userId));

      // Incluir el manager mismo y los miembros del equipo
      advisorIds = [userId, ...teamMembers.map((m: { id: string }) => m.id)];
    } catch (error) {
      // Si hay error, usar solo el userId del manager
      advisorIds = [userId];
    }
  }

  // Sumar monthlyPremium de contact_tags donde:
  // - contact.assignedAdvisorId IN (advisorIds)
  // - tag.businessLine = 'zurich'
  // - monthlyPremium IS NOT NULL
  const result = await dbi
    .select({
      totalMonthlyPremium: sql<number>`COALESCE(SUM(${contactTags.monthlyPremium}), 0)`,
    })
    .from(contactTags)
    .innerJoin(contacts, eq(contactTags.contactId, contacts.id))
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(
      and(
        inArray(contacts.assignedAdvisorId, advisorIds),
        eq(tags.businessLine, 'zurich'),
        isNotNull(contactTags.monthlyPremium)
      )
    );

  const totalMonthlyPremium = result[0]?.totalMonthlyPremium ?? 0;

  // Multiplicar por 12 para obtener producción anual estimada
  return totalMonthlyPremium * 12;
}

/**
 * Calcula el progreso completo del usuario en el plan de carrera
 */
export async function calculateUserCareerProgress(
  userId: string,
  userRole?: UserRole
): Promise<UserCareerProgress> {
  // Obtener todos los niveles activos ordenados por levelNumber
  const allLevels = await db()
    .select()
    .from(careerPlanLevels)
    .where(eq(careerPlanLevels.isActive, true))
    .orderBy(careerPlanLevels.levelNumber);

  // Calcular producción anual (incluye contactos de equipo si es manager)
  const annualProduction = await calculateUserAnnualProduction(userId, userRole);

  // Determinar nivel actual inicial
  const currentLevel = determineLevelFromProduction(annualProduction, allLevels);

  // Obtener siguiente nivel
  const nextLevel = getNextLevel(currentLevel, allLevels);

  // Calcular porcentaje de progreso hacia el nivel actual
  let progressPercentage = 0;
  let displayLevel = currentLevel;
  let displayNextLevel = nextLevel;

  if (currentLevel) {
    // Si tiene nivel actual, calcular progreso hacia ese nivel
    const goalUsd = Number(currentLevel.annualGoalUsd);
    progressPercentage = calculateProgressPercentage(annualProduction, goalUsd);

    // Si el progreso es > 100%, pasar al siguiente nivel automáticamente
    if (progressPercentage > 100 && nextLevel) {
      displayLevel = nextLevel;
      displayNextLevel = getNextLevel(nextLevel, allLevels);
      // Recalcular progreso hacia el nuevo nivel
      const nextGoalUsd = Number(nextLevel.annualGoalUsd);
      progressPercentage = calculateProgressPercentage(annualProduction, nextGoalUsd);
    }
  } else if (nextLevel) {
    // Si no tiene nivel actual pero hay siguiente nivel, calcular progreso hacia ese
    displayLevel = null;
    const goalUsd = Number(nextLevel.annualGoalUsd);
    progressPercentage = calculateProgressPercentage(annualProduction, goalUsd);
  }

  return {
    currentLevel: displayLevel,
    annualProduction,
    progressPercentage,
    nextLevel: displayNextLevel,
  };
}
