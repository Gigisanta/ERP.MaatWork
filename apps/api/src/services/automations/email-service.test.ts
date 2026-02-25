import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailAutomationService, AutomationContext } from './email-service';
import { db } from '@maatwork/db';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  automationConfigs: {
    triggerType: 'triggerType',
    enabled: 'enabled',
  },
  googleOAuthTokens: {
    email: 'email',
    userId: 'userId',
    id: 'id',
  },
  contacts: {
    id: 'id',
  },
  users: {
    id: 'id',
  },
  pipelineStages: {
    id: 'id',
  },
  contactTags: {
    contactId: 'contactId',
    tagId: 'tagId',
  },
  tags: {
    id: 'id',
  },
}));

vi.mock('../../utils/encryption', () => ({
  decryptToken: vi.fn((token) => `decrypted-${token}`),
  encryptToken: vi.fn((token) => `encrypted-${token}`),
}));

vi.mock('../../config/env', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REDIRECT_URI: 'redirect-uri',
    GOOGLE_ENCRYPTION_KEY: 'key-32-characters-long-here-test',
  },
}));

// Mock Google APIs
const mockSend = vi.fn();
const mockGmail = {
  users: {
    messages: {
      send: mockSend,
    },
  },
};

const mockSetCredentials = vi.fn();
const mockOn = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: mockSetCredentials,
        on: mockOn,
      })),
    },
    gmail: vi.fn(() => mockGmail),
  },
}));

vi.mock('../../utils/http/webhook-client', () => ({
  sendWebhook: vi.fn().mockResolvedValue(undefined),
}));


describe('EmailAutomationService', () => {
  let service: EmailAutomationService;
  const mockDb = db as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new EmailAutomationService();
    vi.clearAllMocks();
  });

  it('should not do anything if no automations are enabled', async () => {
    // Mock empty automations
    mockDb.mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await service.checkAndTriggerAutomations('pipeline_stage_change', { contactId: '123' });

    expect(mockSend).not.toHaveBeenCalled();
  });

  // Note: Writing a full mocked test for the complex chain of DB calls is verbose.
  // Ideally we test this with a real DB in integration tests, but here we can verify basic flow.
});
