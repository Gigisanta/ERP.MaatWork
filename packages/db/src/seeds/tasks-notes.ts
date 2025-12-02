/**
 * Seed Tasks and Notes
 * 
 * Seeds tasks and notes for contacts using actual schema structure.
 * Tasks use: status (FK to lookup), priority (FK to lookup), assignedToUserId, createdByUserId, createdFrom
 * Notes use: authorUserId, source (ai/manual/import), noteType (general/summary/action_items)
 */

import { db } from '../index';
import { tasks, notes, contacts, users, lookupTaskStatus, lookupPriority } from '../schema';
import { getRandomElement, getRandomDate, getRandomDateOnly } from './helpers';

// Task data constants
const TASK_TITLES = [
  'Llamar para seguimiento',
  'Enviar propuesta de inversión',
  'Revisar documentación',
  'Agendar reunión de apertura',
  'Actualizar perfil de riesgo',
  'Enviar reporte mensual',
  'Confirmar transferencia',
  'Revisar cartera'
];

const CREATED_FROM_OPTIONS = ['ai', 'manual', 'automation'];

// Note data constants
const NOTE_CONTENTS = [
  'Cliente interesado en diversificar cartera. Mencionó interés en bonos corporativos.',
  'Reunión productiva. Acordamos revisar opciones de FCI la próxima semana.',
  'Solicitó información sobre CEDEARs tecnológicos.',
  'Preocupado por la volatilidad. Sugerí perfil más conservador.',
  'Interesado en aumentar exposición a renta variable.',
  'Confirmó depósito inicial para la próxima semana.',
  'Solicitó reporte detallado de rendimientos YTD.',
  'Mencionó posible referido. Enviar información adicional.',
  'Revisar vencimientos de bonos en cartera.',
  'Cliente satisfecho con el servicio. Potencial para aumentar inversión.'
];

const NOTE_SOURCES = ['manual', 'ai', 'import'];
const NOTE_TYPES = ['general', 'summary', 'action_items'];

/**
 * Seed tasks for contacts
 */
export async function seedTasks(
  contactsList: typeof contacts.$inferSelect[],
  advisorUsers: typeof users.$inferSelect[]
) {
  console.log('📋 Seeding tasks...');

  const existingTasks = await db().select().from(tasks).limit(10);
  if (existingTasks.length >= 10) {
    console.log(`  ⊙ Tasks already seeded: ${existingTasks.length} tasks found\n`);
    return existingTasks;
  }

  // Get status and priority lookups
  const statuses = await db().select().from(lookupTaskStatus);
  const priorities = await db().select().from(lookupPriority);

  if (statuses.length === 0 || priorities.length === 0) {
    console.log('  ⚠️ Missing lookup tables for tasks');
    return [];
  }

  const createdTasks: typeof tasks.$inferSelect[] = [];

  // Create 2-3 tasks per advisor
  for (const advisor of advisorUsers) {
    const numTasks = Math.floor(Math.random() * 2) + 2;
    const advisorContacts = contactsList.filter(c => c.assignedAdvisorId === advisor.id);
    if (advisorContacts.length === 0) continue;

    for (let i = 0; i < numTasks; i++) {
      const contact = getRandomElement(advisorContacts);
      const title = getRandomElement(TASK_TITLES);
      const status = getRandomElement(statuses);
      const priority = getRandomElement(priorities);
      const createdFrom = getRandomElement(CREATED_FROM_OPTIONS);

      // Due date: some past (overdue), some future as string (date type)
      const dueDate = Math.random() > 0.3
        ? getRandomDateOnly(-7, 14) // Future or recent
        : getRandomDateOnly(-30, -1); // Overdue

      const [task] = await db().insert(tasks).values({
        title,
        description: `Seguimiento: ${title} para ${contact.fullName}`,
        dueDate,
        contactId: contact.id,
        assignedToUserId: advisor.id,
        createdByUserId: advisor.id,
        status: status.id,
        priority: priority.id,
        createdFrom
      }).returning();

      createdTasks.push(task);
    }
  }

  console.log(`✅ Tasks seeded: ${createdTasks.length} tasks\n`);
  return createdTasks;
}

/**
 * Seed notes for contacts
 */
export async function seedNotes(
  contactsList: typeof contacts.$inferSelect[],
  advisorUsers: typeof users.$inferSelect[]
) {
  console.log('📝 Seeding notes...');

  const existingNotes = await db().select().from(notes).limit(10);
  if (existingNotes.length >= 10) {
    console.log(`  ⊙ Notes already seeded: ${existingNotes.length} notes found\n`);
    return existingNotes;
  }

  const createdNotes: typeof notes.$inferSelect[] = [];

  // Create 1-3 notes per contact (for some contacts)
  const contactsForNotes = contactsList.filter(() => Math.random() > 0.3);
  
  for (const contact of contactsForNotes) {
    const numNotes = Math.floor(Math.random() * 3) + 1;
    const advisor = advisorUsers.find(a => a.id === contact.assignedAdvisorId)
      ?? getRandomElement(advisorUsers);

    for (let i = 0; i < numNotes; i++) {
      const content = getRandomElement(NOTE_CONTENTS);
      const source = getRandomElement(NOTE_SOURCES);
      const noteType = getRandomElement(NOTE_TYPES);

      const [note] = await db().insert(notes).values({
        content,
        contactId: contact.id,
        authorUserId: advisor.id,
        source,
        noteType
      }).returning();

      createdNotes.push(note);
    }
  }

  console.log(`✅ Notes seeded: ${createdNotes.length} notes\n`);
  return createdNotes;
}
