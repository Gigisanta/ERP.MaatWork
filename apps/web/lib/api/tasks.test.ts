/**
 * Tests para tasks API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './tasks';

vi.mock('./client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      put: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      delete: vi.fn(async (_p: string) => ({ success: true })),
    },
  };
});

describe('tasks api client endpoints', () => {
  

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get tasks endpoint', async () => {
    await apiIndex.getTasks();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/tasks');
  });

  it('calls get tasks endpoint with contactId filter', async () => {
    await apiIndex.getTasks({ contactId: 'contact-123' });
    expect(apiClient.get).toHaveBeenCalledWith('/v1/tasks?contactId=contact-123');
  });

  it('calls get tasks endpoint with all filters', async () => {
    await apiIndex.getTasks({
      contactId: 'contact-123',
      assignedToId: 'user-456',
      status: 'pending',
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/v1/tasks?contactId=contact-123&assignedToId=user-456&status=pending'
    );
  });

  it('calls create task endpoint', async () => {
    const data = { contactId: 'contact-123', title: 'Test task' };
    await apiIndex.createTask(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/tasks', data);
  });

  it('calls update task endpoint', async () => {
    const data = { title: 'Updated task' };
    await apiIndex.updateTask('task-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/tasks/task-123', data);
  });

  it('calls delete task endpoint', async () => {
    await apiIndex.deleteTask('task-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/tasks/task-123');
  });
});
