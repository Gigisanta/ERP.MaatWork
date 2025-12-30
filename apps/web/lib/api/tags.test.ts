/**
 * Tests para tags API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './tags';

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

describe('tags api client endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get tags endpoint', async () => {
    await apiIndex.getTags();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/tags');
  });

  it('calls get tags endpoint with entityType filter', async () => {
    await apiIndex.getTags('contact');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/tags?scope=contact');
  });

  it('maps task entityType to meeting scope', async () => {
    await apiIndex.getTags('task');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/tags?scope=meeting');
  });

  it('calls create tag endpoint', async () => {
    const data = { name: 'Test Tag', entityType: 'contact' };
    await apiIndex.createTag(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/tags', { name: 'Test Tag', scope: 'contact' });
  });

  it('calls create tag endpoint with scope override', async () => {
    const data = { name: 'Test Tag', entityType: 'contact', scope: 'meeting' };
    await apiIndex.createTag(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/tags', { name: 'Test Tag', scope: 'meeting' });
  });

  it('calls update tag endpoint', async () => {
    const data = { name: 'Updated Tag' };
    await apiIndex.updateTag('tag-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/tags/tag-123', data);
  });

  it('calls delete tag endpoint', async () => {
    await apiIndex.deleteTag('tag-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/tags/tag-123');
  });

  it('calls update contact tags endpoint', async () => {
    await apiIndex.updateContactTags('contact-123', ['tag-1', 'tag-2'], ['tag-3']);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/tags/contacts/contact-123', {
      add: ['tag-1', 'tag-2'],
      remove: ['tag-3'],
    });
  });

  it('calls get contact tag endpoint', async () => {
    await apiIndex.getContactTag('contact-123', 'tag-456');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/tags/contacts/contact-123/tags/tag-456');
  });

  it('calls update contact tag endpoint', async () => {
    const data = { monthlyPremium: 1000 };
    await apiIndex.updateContactTag('contact-123', 'tag-456', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/tags/contacts/contact-123/tags/tag-456', data);
  });
});
