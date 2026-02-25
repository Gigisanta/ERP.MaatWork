/**
 * Task Synchronization Service
 *
 * Handles the logic for synchronizing internal tasks to Google Calendar.
 * Supports syncing to Team Calendar (if task is associated with a contact in a team)
 * and Personal Calendar (future expansion, primarily focuses on Team Calendar for now).
 */

import { db, tasks, teams, contacts, googleOAuthTokens } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './google-calendar';
import { decryptToken } from '../utils/encryption';
import { env } from '../config/env';
import { refreshGoogleToken } from '../jobs/google-token-refresh';
import { logger } from '../utils/logger';

type SyncAction = 'create' | 'update' | 'delete';

export async function syncTaskToGoogle(taskId: string, action: SyncAction) {
  try {
    // 1. Fetch task details
    const [task] = await db()
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        dueTime: tasks.dueTime,
        status: tasks.status,
        contactId: tasks.contactId,
        googleEventId: tasks.googleEventId,
        googleCalendarId: tasks.googleCalendarId,
        assignedToUserId: tasks.assignedToUserId,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      logger.warn({ taskId }, '[TaskSync] Task not found');
      return;
    }

    // Handle Delete Action
    if (action === 'delete') {
      if (task.googleEventId && task.googleCalendarId) {
        await deleteEventInternal(task.googleEventId, task.googleCalendarId, task.contactId);
      }
      return;
    }

    // For Create/Update, we need a due date
    if (!task.dueDate) {
      // If task had an event but now has no date, we should probably delete the event
      if (task.googleEventId && task.googleCalendarId) {
        await deleteEventInternal(task.googleEventId, task.googleCalendarId, task.contactId);
        await db()
          .update(tasks)
          .set({ googleEventId: null, googleCalendarId: null })
          .where(eq(tasks.id, taskId));
      }
      return;
    }

    // 2. Determine Target Calendar
    // Priority: Team Calendar (via Contact) -> Personal Calendar (fallback, not implemented yet)
    let targetCalendarId: string | null = null;
    let accessToken: string | null = null;

    if (task.contactId) {
      const [contact] = await db()
        .select({ assignedTeamId: contacts.assignedTeamId })
        .from(contacts)
        .where(eq(contacts.id, task.contactId))
        .limit(1);

      if (contact?.assignedTeamId) {
        const [team] = await db()
          .select({
            calendarId: teams.calendarId,
            connectedByUserId: teams.calendarConnectedByUserId,
          })
          .from(teams)
          .where(eq(teams.id, contact.assignedTeamId))
          .limit(1);

        if (team?.calendarId && team.connectedByUserId) {
          // Get tokens from the manager who connected the calendar
          const tokenData = await getValidAccessToken(team.connectedByUserId);
          if (tokenData) {
            targetCalendarId = team.calendarId;
            accessToken = tokenData;
          }
        }
      }
    }

    // If we couldn't find a team calendar, we stop here (for now)
    // Future: Fallback to assignedToUserId's personal calendar
    if (!targetCalendarId || !accessToken) {
      // If it was previously synced but now we lost access/context, we might want to log it
      // or try to delete using stored googleCalendarId if we can find credentials?
      // For now, simple return.
      return;
    }

    // 3. Prepare Event Data
    const eventData = mapTaskToEvent(task);

    // 4. Perform Sync
    if (task.googleEventId && task.googleCalendarId === targetCalendarId) {
      // Update existing event
      try {
        await updateCalendarEvent(accessToken, targetCalendarId, task.googleEventId, eventData);
        logger.info({ googleEventId: task.googleEventId, taskId }, '[TaskSync] Updated event');
      } catch (error) {
        logger.error(
          { err: error, taskId, googleEventId: task.googleEventId },
          '[TaskSync] Failed to update event'
        );
        // If 404, maybe recreate?
      }
    } else {
      // Create new event (or recreate if calendar changed)
      try {
        const newEvent = await createCalendarEvent(accessToken, targetCalendarId, eventData);

        if (newEvent.id) {
          await db()
            .update(tasks)
            .set({
              googleEventId: newEvent.id,
              googleCalendarId: targetCalendarId,
            })
            .where(eq(tasks.id, taskId));

          logger.info({ googleEventId: newEvent.id, taskId }, '[TaskSync] Created event');
        }
      } catch (error) {
        logger.error({ err: error, taskId }, '[TaskSync] Failed to create event');
      }
    }
  } catch (error) {
    logger.error({ err: error, taskId }, '[TaskSync] Error syncing task');
  }
}

async function deleteEventInternal(
  googleEventId: string,
  googleCalendarId: string,
  contactId: string | null
) {
  // We need an access token to delete.
  // We try to find it via the contact's team again.
  if (!contactId) return;

  const [contact] = await db()
    .select({ assignedTeamId: contacts.assignedTeamId })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (contact?.assignedTeamId) {
    const [team] = await db()
      .select({
        calendarId: teams.calendarId,
        connectedByUserId: teams.calendarConnectedByUserId,
      })
      .from(teams)
      .where(eq(teams.id, contact.assignedTeamId))
      .limit(1);

    if (team?.calendarId === googleCalendarId && team.connectedByUserId) {
      const accessToken = await getValidAccessToken(team.connectedByUserId);
      if (accessToken) {
        try {
          await deleteCalendarEvent(accessToken, googleCalendarId, googleEventId);
          logger.info({ googleEventId }, '[TaskSync] Deleted event');
        } catch (error) {
          logger.error({ err: error, googleEventId }, '[TaskSync] Failed to delete event');
        }
      }
    }
  }
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const [tokenRecord] = await db()
    .select()
    .from(googleOAuthTokens)
    .where(eq(googleOAuthTokens.userId, userId))
    .limit(1);

  if (!tokenRecord) return null;

  if (tokenRecord.expiresAt < new Date()) {
    try {
      await refreshGoogleToken(tokenRecord.id);
      // Re-fetch
      const [updated] = await db()
        .select()
        .from(googleOAuthTokens)
        .where(eq(googleOAuthTokens.id, tokenRecord.id))
        .limit(1);

      if (updated) {
        return decryptToken(updated.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);
      }
    } catch (e) {
      logger.error({ err: e, userId }, '[TaskSync] Failed to refresh token');
      return null;
    }
  }

  return decryptToken(tokenRecord.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);
}

interface TaskForSync {
  title: string;
  description: string | null;
  dueDate: string | Date | null;
  dueTime: string | null;
}

function mapTaskToEvent(task: TaskForSync) {
  // Construct Date/Time
  // If dueTime is present (HH:MM), combine with dueDate
  // If not, use All Day Event (date only)

  let start: { dateTime: string; timeZone: string } | { date: string };
  let end: { dateTime: string; timeZone: string } | { date: string };

  if (task.dueTime && task.dueDate) {
    // Assuming task.dueDate is YYYY-MM-DD string from Postgres driver or Date object
    // Drizzle date returns string usually
    const dateStr =
      typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString().split('T')[0];
    const dateTime = `${dateStr}T${task.dueTime}:00`;

    start = { dateTime, timeZone: 'America/Argentina/Buenos_Aires' }; // Default timezone or fetch from user?
    // Default duration 1 hour
    // Parse time, add 1 hour
    const [hours, minutes] = task.dueTime.split(':').map(Number);
    const endDate = new Date(dateTime);
    endDate.setHours(hours + 1);
    const endDateTime = endDate.toISOString().split('.')[0]; // remove ms

    end = { dateTime: endDateTime, timeZone: 'America/Argentina/Buenos_Aires' };
  } else if (task.dueDate) {
    // All day
    const dateStr =
      typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString().split('T')[0];
    start = { date: dateStr };
    end = { date: dateStr };
  } else {
    // Should not happen as we check for dueDate before calling mapTaskToEvent
    const today = new Date().toISOString().split('T')[0];
    start = { date: today };
    end = { date: today };
  }

  return {
    summary: `📝 ${task.title}`,
    description: task.description || '',
    start,
    end,
  };
}
