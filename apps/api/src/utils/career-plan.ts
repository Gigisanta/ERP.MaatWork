/**
 * Utilidades para el cálculo del plan de carrera comercial
 */

import { db, contactTags, contacts, tags, careerPlanLevels, users, teamMembership, teams } from '@cactus/db';
import { eq, and, isNotNull, sql, inArray } from 'drizzle-orm';
import type { CareerPlanLevel, UserCareerProgress } from '../types/career-plan';
import type { UserRole } from '../auth/types';

/**
 * Calcula la producción anual estimada de un usuario
 * Suma todas las primas mensuales de contactos con tags Zurich asignados al usuario
 * Para managers, incluye contactos de miembros del equipo
 * Multiplica por 12 para obtener producción anual estimada
 */
export async function calculateUserAnnualProduction(userId: string, userRole?: UserRole): Promise<number> {
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
      totalMonthlyPremium: sql<number>`COALESCE(SUM(${contactTags.monthlyPremium}), 0)`
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
 * Determina el nivel actual del usuario basado en su producción anual
 * Retorna el nivel más alto que el usuario ha alcanzado (mayor o igual al objetivo)
 */
export async function determineUserLevel(
  annualProduction: number,
  levels: CareerPlanLevel[]
): Promise<CareerPlanLevel | null> {
  if (!levels || levels.length === 0) {
    return null;
  }

  // Ordenar niveles por levelNumber descendente (mayor a menor)
  const sortedLevels = [...levels]
    .filter(level => level.isActive)
    .sort((a, b) => b.levelNumber - a.levelNumber);

  // Encontrar el nivel más alto que el usuario ha alcanzado
  // (producción anual >= objetivo anual del nivel)
  for (const level of sortedLevels) {
    const goalUsd = Number(level.annualGoalUsd);
    if (annualProduction >= goalUsd) {
      return level;
    }
  }

  // Si no alcanzó ningún nivel, retornar null (o el nivel más bajo si se prefiere)
  return null;
}

/**
 * Calcula el porcentaje de progreso hacia el objetivo del nivel actual
 * Retorna un número entre 0 y 100+ (puede ser mayor a 100 si superó el objetivo)
 */
export function calculateProgressPercentage(
  annualProduction: number,
  levelGoal: number
): number {
  if (levelGoal === 0) {
    return 0;
  }
  
  const percentage = (annualProduction / levelGoal) * 100;
  return Math.round(percentage * 100) / 100; // Redondear a 2 decimales
}

/**
 * Obtiene el siguiente nivel después del nivel actual
 */
export async function getNextLevel(
  currentLevel: CareerPlanLevel | null,
  levels: CareerPlanLevel[]
): Promise<CareerPlanLevel | null> {
  if (!currentLevel) {
    // Si no hay nivel actual, retornar el nivel más bajo (levelNumber = 1)
    const lowestLevel = levels
      .filter(level => level.isActive)
      .sort((a, b) => a.levelNumber - b.levelNumber)[0];
    return lowestLevel || null;
  }

  // Encontrar el siguiente nivel (levelNumber mayor)
  const nextLevel = levels
    .filter(level => level.isActive && level.levelNumber > currentLevel.levelNumber)
    .sort((a, b) => a.levelNumber - b.levelNumber)[0];

  return nextLevel || null;
}

/**
 * Calcula el progreso completo del usuario en el plan de carrera
 */
export async function calculateUserCareerProgress(userId: string, userRole?: UserRole): Promise<UserCareerProgress> {
  // Obtener todos los niveles activos ordenados por levelNumber
  const allLevels = await db()
    .select()
    .from(careerPlanLevels)
    .where(eq(careerPlanLevels.isActive, true))
    .orderBy(careerPlanLevels.levelNumber);

  // Calcular producción anual (incluye contactos de equipo si es manager)
  const annualProduction = await calculateUserAnnualProduction(userId, userRole);

  // Determinar nivel actual inicial
  let currentLevel = await determineUserLevel(annualProduction, allLevels);
  
  // Obtener siguiente nivel
  let nextLevel = await getNextLevel(currentLevel, allLevels);

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
      displayNextLevel = await getNextLevel(nextLevel, allLevels);
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
    nextLevel: displayNextLevel
  };
}

