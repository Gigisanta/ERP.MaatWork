/**
 * Tests para notes API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './notes';

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

describe('notes api client endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get notes endpoint', async () => {
    await apiIndex.getNotes();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/notes');
  });

  it('calls get notes endpoint with contactId filter', async () => {
    await apiIndex.getNotes({ contactId: 'contact-123' });
    expect(apiClient.get).toHaveBeenCalledWith('/v1/notes?contactId=contact-123');
  });

  it('calls create note endpoint', async () => {
    const data = { contactId: 'contact-123', content: 'Test note' };
    await apiIndex.createNote(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/notes', data);
  });

  it('calls update note endpoint', async () => {
    const data = { content: 'Updated note' };
    await apiIndex.updateNote('note-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/notes/note-123', data);
  });

  it('calls delete note endpoint', async () => {
    await apiIndex.deleteNote('note-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/notes/note-123');
  });
});
