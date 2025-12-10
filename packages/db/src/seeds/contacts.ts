/**
 * Seed Contacts
 *
 * Seeds contacts with pipeline stages and history
 */

import { db } from '../index';
import { contacts, pipelineStageHistory, pipelineStages, teams, users } from '../schema';
import { eq, type InferSelectModel } from 'drizzle-orm';
import {
  getRandomElement,
  getRandomElements,
  getRandomDate,
  generateRandomName,
  generateRandomEmail,
  generateRandomPhone,
  generateRandomDNI,
} from './helpers';

// Contact data constants
const RISK_PROFILES = ['low', 'mid', 'high'];
const SOURCES = ['referral', 'website', 'event', 'cold_call', 'social_media', 'other'];
const OCCUPATIONS = [
  'Ingeniero',
  'Médico',
  'Abogado',
  'Contador',
  'Empresario',
  'Ejecutivo',
  'Profesor',
  'Arquitecto',
  'Consultor',
  'Comerciante',
  'Inversor',
  'Retirado',
  'Emprendedor',
  'Directivo',
];
const PRIORITIES_LIST = [
  'Ahorro para retiro',
  'Educación de hijos',
  'Protección de patrimonio',
  'Crecimiento de inversiones',
  'Planificación fiscal',
];
const CONCERNS_LIST = [
  'Volatilidad del mercado',
  'Inseguridad económica',
  'Inflación',
  'Riesgo de pérdida',
  'Falta de conocimiento',
];

// Stage distribution for contacts
const STAGE_DISTRIBUTION = [
  { stageName: 'Prospecto', count: 12 },
  { stageName: 'Contactado', count: 10 },
  { stageName: 'Primera reunion', count: 8 },
  { stageName: 'Segunda reunion', count: 6 },
  { stageName: 'Cliente', count: 8 },
  { stageName: 'Cuenta vacia', count: 3 },
  { stageName: 'Caido', count: 3 },
];

/**
 * Create a single contact
 */
async function createContact(
  stage: InferSelectModel<typeof pipelineStages>,
  advisorUsers: InferSelectModel<typeof users>[],
  teamsList: InferSelectModel<typeof teams>[]
): Promise<InferSelectModel<typeof contacts> | null> {
  const name = generateRandomName();
  const email = generateRandomEmail(name.firstName, name.lastName);

  // Check if email already exists
  const existing = await db().select().from(contacts).where(eq(contacts.email, email)).limit(1);
  if (existing.length > 0) return null;

  const advisor = getRandomElement(advisorUsers);
  const team = teamsList.length > 0 ? getRandomElement(teamsList) : null;
  const riskProfile = getRandomElement(RISK_PROFILES);
  const source = getRandomElement(SOURCES);
  const occupation = getRandomElement(OCCUPATIONS);

  // Generate financial data
  const ingresos = (Math.random() * 500000 + 100000).toFixed(2);
  const gastos = (Math.random() * 400000 + 80000).toFixed(2);
  const excedente = (parseFloat(ingresos) - parseFloat(gastos)).toFixed(2);

  // Generate priorities and concerns
  const numPriorities = Math.floor(Math.random() * 3) + 1;
  const numConcerns = Math.floor(Math.random() * 3) + 1;
  const prioridades = getRandomElements(PRIORITIES_LIST, numPriorities);
  const preocupaciones = getRandomElements(CONCERNS_LIST, numConcerns);

  // Generate dates
  const createdAt = getRandomDate(90, 0);
  const contactLastTouchAt = Math.random() > 0.3 ? getRandomDate(30, 0) : getRandomDate(60, 0);

  const contactData = {
    firstName: name.firstName,
    lastName: name.lastName,
    fullName: `${name.firstName} ${name.lastName}`,
    email,
    phone: generateRandomPhone(),
    dni: generateRandomDNI(),
    country: 'AR',
    pipelineStageId: stage.id,
    source,
    riskProfile,
    assignedAdvisorId: advisor.id,
    assignedTeamId: team?.id ?? null,
    queSeDedica: occupation,
    familia: Math.random() > 0.5 ? 'Casado/a con hijos' : 'Soltero/a',
    expectativas: 'Busco asesoramiento profesional para mis inversiones',
    objetivos: 'Aumentar patrimonio a largo plazo',
    requisitosPlanificacion: 'Necesito entender las opciones disponibles',
    prioridades: prioridades,
    preocupaciones: preocupaciones,
    ingresos: ingresos,
    gastos: gastos,
    excedente: excedente,
    contactLastTouchAt,
    pipelineStageUpdatedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  const [contact] = await db().insert(contacts).values(contactData).returning();
  return contact;
}

/**
 * Create pipeline stage history entry
 */
async function createStageHistory(
  contact: InferSelectModel<typeof contacts>,
  currentStage: InferSelectModel<typeof pipelineStages>,
  pipelineStagesList: InferSelectModel<typeof pipelineStages>[],
  advisorId: string,
  createdAt: Date
): Promise<void> {
  if (Math.random() > 0.7) {
    const previousStage = pipelineStagesList.find((s) => s.order! < currentStage.order!);
    if (previousStage) {
      await db()
        .insert(pipelineStageHistory)
        .values({
          contactId: contact.id,
          fromStage: previousStage.name,
          toStage: currentStage.name,
          reason: 'Avance en el proceso',
          changedByUserId: advisorId,
          changedAt: createdAt,
        })
        .onConflictDoNothing();
    }
  }
}

/**
 * Seed contacts with pipeline stages
 */
export async function seedContacts(
  advisorUsers: InferSelectModel<typeof users>[],
  teamsList: InferSelectModel<typeof teams>[],
  pipelineStagesList: InferSelectModel<typeof pipelineStages>[]
): Promise<InferSelectModel<typeof contacts>[]> {
  console.log('📇 Seeding contacts...');

  const existingContacts = await db().select().from(contacts).limit(50);
  if (existingContacts.length >= 40) {
    console.log(`  ⊙ Contacts already seeded: ${existingContacts.length} contacts found\n`);
    return existingContacts;
  }

  const createdContacts: InferSelectModel<typeof contacts>[] = [];

  for (const distribution of STAGE_DISTRIBUTION) {
    const stage = pipelineStagesList.find((s) => s.name === distribution.stageName);
    if (!stage) continue;

    for (let i = 0; i < distribution.count; i++) {
      const contact = await createContact(stage, advisorUsers, teamsList);
      if (contact) {
        createdContacts.push(contact);

        // Create some pipeline stage history
        await createStageHistory(
          contact,
          stage,
          pipelineStagesList,
          contact.assignedAdvisorId!,
          contact.createdAt
        );
      }
    }
  }

  console.log(`✅ Contacts seeded: ${createdContacts.length} contacts\n`);
  return createdContacts;
}
