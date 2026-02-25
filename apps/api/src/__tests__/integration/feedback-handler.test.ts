import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { handleCreateFeedback } from '../../routes/feedback/handlers';
import { createTestUser, deleteTestUser } from '../helpers/test-auth';
import { db } from '@maatwork/db';
import { feedback, notifications, users } from '@maatwork/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { Request, Response } from 'express';

describe('Feedback Handler Integration Test', () => {
  let testUserId: string;
  let testAdminId: string;

  beforeAll(async () => {
    // Create regular user to submit feedback
    const user = await createTestUser({
      email: `feedback-user-${Date.now()}@example.com`,
      role: 'advisor',
      active: true
    });
    testUserId = user.id;

    // Create admin user to receive notification
    const admin = await createTestUser({
      email: `feedback-admin-${Date.now()}@example.com`,
      role: 'admin',
      active: true
    });
    testAdminId = admin.id;
  });

  afterAll(async () => {
    // Cleanup feedback first due to FK constraint
    if (testUserId) {
        await db().delete(feedback).where(eq(feedback.userId, testUserId));
    }
    // Notifications should cascade delete or might need cleanup if not.
    // Let's assume cascade or clean them up explicitly to be safe.
    if (testAdminId) {
        await db().delete(notifications).where(eq(notifications.userId, testAdminId));
    }

    if (testUserId) await deleteTestUser(testUserId);
    if (testAdminId) await deleteTestUser(testAdminId);
  });

  it('should successfully create feedback and generate notifications', async () => {
    // Mock Request with logger
    const req = {
      user: { id: testUserId },
      body: {
        type: 'feedback',
        content: 'This is a test feedback message for integration testing.',
      },
      log: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      }
    } as unknown as Request;

    // Mock Response
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnThis();
    const res = {
      json: jsonMock,
      status: statusMock,
      headersSent: false
    } as unknown as Response;

    const next = vi.fn();

    // Act: Invoke the handler
    await handleCreateFeedback(req, res, next);

    // Assert: Check response
    expect(jsonMock).toHaveBeenCalled();
    const responseData = jsonMock.mock.calls[0][0];
    
    // Verify structure { success: true, data: { ... } }
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    expect(responseData.data.content).toBe(req.body.content);
    expect(responseData.data.userId).toBe(testUserId);

    // Assert: Check Database Side Effects
    
    // 1. Verify Feedback was saved
    const [savedFeedback] = await db()
      .select()
      .from(feedback)
      .where(eq(feedback.userId, testUserId))
      .orderBy(desc(feedback.createdAt))
      .limit(1);
      
    expect(savedFeedback).toBeDefined();
    expect(savedFeedback.content).toBe(req.body.content);

    // 2. Verify Notification was created for the admin
    // This part specifically verifies the 'notifications' import works
    const [adminNotification] = await db()
      .select()
      .from(notifications)
      .where(
        and(
           eq(notifications.userId, testAdminId),
           eq(notifications.type, 'feedback_received')
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    expect(adminNotification).toBeDefined();
    expect(adminNotification?.payload).toEqual(expect.objectContaining({
        type: 'feedback'
    }));
  });
});
