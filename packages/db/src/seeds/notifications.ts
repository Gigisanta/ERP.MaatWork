/**
 * Seed Notifications
 *
 * Seeds notifications for users using actual schema structure.
 * notifications: userId, type (FK to lookup), severity, renderedBody, etc.
 */

import { db } from '../index';
import { notifications, lookupNotificationType, users, contacts } from '../schema';
import { getRandomElement, getRandomDate } from './helpers';

// Notification data constants
const NOTIFICATION_MESSAGES = [
  { severity: 'info', body: 'Se te ha asignado una nueva tarea de seguimiento' },
  { severity: 'warning', body: 'Tienes una reunión programada para hoy' },
  { severity: 'info', body: 'Un contacto ha actualizado su información' },
  { severity: 'warning', body: 'Hay documentos pendientes de revisión' },
  { severity: 'success', body: 'Has alcanzado tu meta mensual de contactos' },
  { severity: 'info', body: 'Un nuevo prospecto ha sido asignado a tu cartera' },
  { severity: 'warning', body: 'Hay vencimientos de inversión próximos en tu cartera' },
  { severity: 'success', body: 'El reporte mensual está disponible para descarga' },
  { severity: 'critical', body: 'Alerta: Cliente VIP requiere atención urgente' },
];

/**
 * Seed notifications for users
 */
export async function seedNotifications(
  advisorUsers: (typeof users.$inferSelect)[],
  contactsList: (typeof contacts.$inferSelect)[]
) {
  console.log('🔔 Seeding notifications...');

  const existingNotifications = await db().select().from(notifications).limit(10);
  if (existingNotifications.length >= 10) {
    console.log(
      `  ⊙ Notifications already seeded: ${existingNotifications.length} notifications found\n`
    );
    return existingNotifications;
  }

  // Get notification types
  const notificationTypes = await db().select().from(lookupNotificationType);
  if (notificationTypes.length === 0) {
    console.log('  ⚠️ Missing notification type lookups');
    return [];
  }

  const createdNotifications: (typeof notifications.$inferSelect)[] = [];

  // Create 3-5 notifications per advisor
  for (const advisor of advisorUsers) {
    const numNotifications = Math.floor(Math.random() * 3) + 3;
    const advisorContacts = contactsList.filter((c) => c.assignedAdvisorId === advisor.id);

    for (let i = 0; i < numNotifications; i++) {
      const notifData = getRandomElement(NOTIFICATION_MESSAGES);
      const notifType = getRandomElement(notificationTypes);
      const isRead = Math.random() > 0.6;
      const contact = advisorContacts.length > 0 ? getRandomElement(advisorContacts) : null;

      const [notification] = await db()
        .insert(notifications)
        .values({
          userId: advisor.id,
          type: notifType.id,
          severity: notifData.severity,
          renderedBody: notifData.body,
          contactId: contact?.id ?? null,
          readAt: isRead ? new Date() : null,
          processed: false,
        })
        .returning();

      createdNotifications.push(notification);
    }
  }

  console.log(`✅ Notifications seeded: ${createdNotifications.length} notifications\n`);
  return createdNotifications;
}
