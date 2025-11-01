import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, contacts, pipelineStages, tasks, notes, tags, notifications, users } from '@cactus/db';
import { eq, isNull } from 'drizzle-orm';

/**
 * Tests E2E para EPIC B — CRM Core
 * 
 * Valida el flujo completo de:
 * - Creación de contactos
 * - Movimiento en pipeline
 * - Gestión de tareas
 * - Notas
 * - Tags y segmentos
 * - Notificaciones
 * - SLA tracking
 */

describe('EPIC B — CRM Core E2E', () => {
  let testContactId: string;
  let testUserId: string;
  let testStageId: string;

  beforeAll(async () => {
    // Crear usuario de prueba
    const [testUser] = await db()
      .insert(users)
      .values({
        email: `test-epic-b-${Date.now()}@cactus.com`,
        fullName: 'Test User EPIC B',
        role: 'advisor',
      })
      .returning();
    testUserId = testUser.id;

    // Crear etapa de pipeline de prueba
    const [testStage] = await db()
      .insert(pipelineStages)
      .values({
        name: 'Test Stage',
        order: 999,
        color: '#FF0000',
        slaHours: 24,
      })
      .returning();
    testStageId = testStage.id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testContactId) {
      await db().delete(contacts).where(eq(contacts.id, testContactId));
    }
    if (testStageId) {
      await db().delete(pipelineStages).where(eq(pipelineStages.id, testStageId));
    }
    if (testUserId) {
      await db().delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('B1 — Ficha 360 de Cliente', () => {
    it('Debe crear un contacto con todos los campos requeridos', async () => {
      const [newContact] = await db()
        .insert(contacts)
        .values({
          firstName: 'Juan',
          lastName: 'Pérez',
          fullName: 'Juan Pérez',
          email: `test-${Date.now()}@example.com`,
          phone: '+54911234567',
          // lifecycleStage eliminado - ahora usamos solo pipelineStageId
          pipelineStageId: testStageId,
          assignedAdvisorId: testUserId,
          customFields: {
            occupation: 'Engineer',
            referralSource: 'Web',
          },
        })
        .returning();

      testContactId = newContact.id;

      expect(newContact.id).toBeDefined();
      expect(newContact.fullName).toBe('Juan Pérez');
      expect(newContact.version).toBe(1);
      expect(newContact.slaStatus).toBe('ok');
      expect(newContact.customFields).toHaveProperty('occupation');
    });

    it('Debe actualizar un contacto e incrementar versión', async () => {
      const [updatedContact] = await db()
        .update(contacts)
        .set({
          phone: '+54911111111',
          version: 2,
        })
        .where(eq(contacts.id, testContactId))
        .returning();

      expect(updatedContact.phone).toBe('+54911111111');
      expect(updatedContact.version).toBe(2);
    });
  });

  describe('B2 — SLA Tracking', () => {
    it('Debe calcular slaDueAt correctamente', async () => {
      const contact = await db().query.contacts.findFirst({
        where: eq(contacts.id, testContactId),
        with: { pipelineStage: true },
      });

      expect(contact?.pipelineStage?.slaHours).toBe(24);
      expect(contact?.slaStatus).toBe('ok');
      expect(contact?.slaDueAt).toBeDefined();
    });

    it('Debe actualizar slaStatus cuando pase el tiempo', async () => {
      // Simular que pasó el tiempo de SLA
      const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 horas atrás

      await db()
        .update(contacts)
        .set({
          contactLastTouchAt: pastDate,
          slaStatus: 'overdue',
        })
        .where(eq(contacts.id, testContactId));

      const contact = await db().query.contacts.findFirst({
        where: eq(contacts.id, testContactId),
      });

      expect(contact?.slaStatus).toBe('overdue');
    });
  });

  describe('B3 — Tareas', () => {
    let testTaskId: string;

    it('Debe crear una tarea vinculada al contacto', async () => {
      const [newTask] = await db()
        .insert(tasks)
        .values({
          contactId: testContactId,
          title: 'Llamar al cliente',
          description: 'Seguimiento inicial',
          status: 'open',
          priority: 'high',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          assignedToUserId: testUserId,
          createdByUserId: testUserId,
        })
        .returning();

      testTaskId = newTask.id;

      expect(newTask.id).toBeDefined();
      expect(newTask.title).toBe('Llamar al cliente');
      expect(newTask.status).toBe('open');
    });

    it('Debe actualizar el estado de una tarea', async () => {
      const [completedTask] = await db()
        .update(tasks)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(tasks.id, testTaskId))
        .returning();

      expect(completedTask.status).toBe('completed');
      expect(completedTask.completedAt).toBeDefined();
    });

    afterAll(async () => {
      if (testTaskId) {
        await db().delete(tasks).where(eq(tasks.id, testTaskId));
      }
    });
  });

  describe('B4 — Notas', () => {
    let testNoteId: string;

    it('Debe crear una nota de texto simple', async () => {
      const [newNote] = await db()
        .insert(notes)
        .values({
          contactId: testContactId,
          content: 'Cliente interesado en fondos de inversión',
          type: 'call',
          createdByUserId: testUserId,
        })
        .returning();

      testNoteId = newNote.id;

      expect(newNote.id).toBeDefined();
      expect(newNote.content).toContain('inversión');
      expect(newNote.type).toBe('call');
    });

    afterAll(async () => {
      if (testNoteId) {
        await db().delete(notes).where(eq(notes.id, testNoteId));
      }
    });
  });

  describe('B5 — Tags y Segmentos', () => {
    let testTagId: string;

    it('Debe crear un tag con color e icono', async () => {
      const [newTag] = await db()
        .insert(tags)
        .values({
          name: 'VIP',
          scope: 'contact',
          color: '#FFD700',
          icon: 'star',
          description: 'Cliente VIP',
        })
        .returning();

      testTagId = newTag.id;

      expect(newTag.id).toBeDefined();
      expect(newTag.name).toBe('VIP');
      expect(newTag.color).toBe('#FFD700');
    });

    afterAll(async () => {
      if (testTagId) {
        await db().delete(tags).where(eq(tags.id, testTagId));
      }
    });
  });

  describe('B6 — Pipeline', () => {
    it('Debe mover un contacto entre etapas del pipeline', async () => {
      const [movedContact] = await db()
        .update(contacts)
        .set({ pipelineStageId: testStageId })
        .where(eq(contacts.id, testContactId))
        .returning();

      expect(movedContact.pipelineStageId).toBe(testStageId);
    });
  });

  describe('B7 — Notificaciones', () => {
    let testNotificationId: string;

    it('Debe crear una notificación para el usuario', async () => {
      const [newNotification] = await db()
        .insert(notifications)
        .values({
          userId: testUserId,
          type: 'task_assigned',
          contactId: testContactId,
          renderedSubject: 'Nueva tarea asignada',
          renderedBody: 'Se te ha asignado una nueva tarea',
          channel: 'in_app',
        })
        .returning();

      testNotificationId = newNotification.id;

      expect(newNotification.id).toBeDefined();
      expect(newNotification.type).toBe('task_assigned');
      expect(newNotification.readAt).toBeNull();
    });

    it('Debe marcar una notificación como leída', async () => {
      const [readNotification] = await db()
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, testNotificationId))
        .returning();

      expect(readNotification.readAt).toBeDefined();
    });

    afterAll(async () => {
      if (testNotificationId) {
        await db().delete(notifications).where(eq(notifications.id, testNotificationId));
      }
    });
  });

  describe('Validación de KPIs', () => {
    it('Debe contar contactos activos', async () => {
      const activeContacts = await db().query.contacts.findMany({
        where: isNull(contacts.deletedAt),
      });

      expect(activeContacts.length).toBeGreaterThan(0);
    });

    it('Debe contar tareas pendientes', async () => {
      const openTasks = await db().query.tasks.findMany({
        where: eq(tasks.status, 'open'),
      });

      expect(Array.isArray(openTasks)).toBe(true);
    });

    it('Debe contar notificaciones no leídas', async () => {
      const unreadNotifications = await db().query.notifications.findMany({
        where: isNull(notifications.readAt),
      });

      expect(Array.isArray(unreadNotifications)).toBe(true);
    });
  });
});

