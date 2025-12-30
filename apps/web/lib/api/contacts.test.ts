/**
 * Tests para contacts API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as contactsApi from './contacts';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(async (_p: string) => ({ success: true, data: [] })),
    post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
    patch: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
    delete: vi.fn(async (_p: string) => ({ success: true })),
  },
}));

describe('contacts api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getContacts endpoint', async () => {
    await contactsApi.getContacts();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/contacts');
  });

  it('calls getContacts with params', async () => {
    await contactsApi.getContacts({ assignedAdvisorId: 'advisor-1', limit: 10 });
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/v1/contacts'));
  });

  it('calls getContactById endpoint', async () => {
    await contactsApi.getContactById('contact-1');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/contacts/contact-1');
  });

  it('calls createContact endpoint', async () => {
    await contactsApi.createContact({ firstName: 'John', lastName: 'Doe' });
    expect(apiClient.post).toHaveBeenCalledWith('/v1/contacts', expect.any(Object));
  });

  it('calls updateContact endpoint', async () => {
    await contactsApi.updateContact('contact-1', { firstName: 'Jane' });
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/contacts/contact-1', expect.any(Object));
  });

  it('calls deleteContact endpoint', async () => {
    await contactsApi.deleteContact('contact-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/contacts/contact-1');
  });
});
