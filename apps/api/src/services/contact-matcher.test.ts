import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSingleContactMeetingStatus } from './contact-matcher';
import { db, contacts, calendarEvents, contactAliases } from '@cactus/db';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  contacts: {
    id: 'contacts.id',
    meetingStatus: 'contacts.meeting_status',
    updatedAt: 'contacts.updated_at',
    $inferSelect: {}, // Mock inferSelect
  },
  calendarEvents: {
    userId: 'calendar_events.user_id',
    attendees: 'calendar_events.attendees',
    startAt: 'calendar_events.start_at',
    status: 'calendar_events.status',
    id: 'calendar_events.id',
  },
  contactAliases: {
    contactId: 'contact_aliases.contact_id',
    aliasNormalized: 'contact_aliases.alias_normalized',
  },
}));

vi.mock('@cactus/api/src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ContactMatcher', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db as any).mockReturnValue(mockDb);
  });

  it('should update contact meeting status correctly using email match', async () => {
    const contact = {
      id: 'contact-1',
      email: 'test@example.com',
      assignedAdvisorId: 'advisor-1',
      meetingStatus: null,
    };

    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000);
    const futureDate = new Date(now.getTime() + 86400000);

    // Mock aliases (empty)
    mockDb.where.mockResolvedValueOnce([]);

    // Mock events
    const events = [
      {
        id: 'event-1',
        startAt: pastDate,
        status: 'confirmed',
        attendees: [{ email: 'test@example.com' }],
      },
      {
        id: 'event-2',
        startAt: futureDate,
        status: 'confirmed',
        attendees: [{ email: 'test@example.com' }],
      },
    ];

    mockDb.orderBy.mockResolvedValue(events);

    await updateSingleContactMeetingStatus(contact as any);

    expect(mockDb.update).toHaveBeenCalledWith(contacts);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingStatus: expect.objectContaining({
          firstMeeting: expect.objectContaining({
            completed: true,
            scheduled: true,
            eventId: 'event-1',
          }),
        }),
      })
    );
  });

  it('should match using aliases even without email', async () => {
    const contact = {
      id: 'contact-1',
      email: null,
      fullName: 'Juan Perez',
      assignedAdvisorId: 'advisor-1',
      meetingStatus: null,
    };

    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000);

    // Mock aliases
    mockDb.where.mockResolvedValueOnce([
      { aliasNormalized: 'juan perez' },
      { aliasNormalized: 'j perez' },
    ]);

    // Mock events
    const events = [
      {
        id: 'event-1',
        startAt: pastDate,
        status: 'confirmed',
        attendees: [{ displayName: 'J. Perez' }], // Matches alias 'j perez' after normalization
      },
    ];

    mockDb.orderBy.mockResolvedValue(events);

    await updateSingleContactMeetingStatus(contact as any);

    expect(mockDb.update).toHaveBeenCalledWith(contacts);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingStatus: expect.objectContaining({
          firstMeeting: expect.objectContaining({
            completed: true,
            scheduled: true,
            eventId: 'event-1',
          }),
        }),
      })
    );
  });

  it('should not update if status has not changed', async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000);

    const currentStatus = {
      firstMeeting: {
        scheduled: true,
        completed: true,
        at: pastDate.toISOString(),
        eventId: 'event-1',
      },
      secondMeeting: {
        scheduled: false,
        completed: false,
        at: null,
        eventId: null,
      },
      lastCheckedAt: now.toISOString(),
    };

    const contact = {
      id: 'contact-1',
      email: 'test@example.com',
      assignedAdvisorId: 'advisor-1',
      meetingStatus: currentStatus,
    };

    // Mock aliases
    mockDb.where.mockResolvedValueOnce([]);

    const events = [
      {
        id: 'event-1',
        startAt: pastDate,
        status: 'confirmed',
        attendees: [{ email: 'test@example.com' }],
      },
    ];

    mockDb.orderBy.mockResolvedValue(events);

    await updateSingleContactMeetingStatus(contact as any);

    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
