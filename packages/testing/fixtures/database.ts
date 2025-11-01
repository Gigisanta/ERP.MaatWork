/**
 * Database test fixtures
 * Provides mock data and helpers for database testing
 */

// Note: vitest vi should be imported in actual test files

export interface MockContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  owner_id: string;
}

export interface MockDeal {
  id: string;
  title: string;
  value: number;
  stage: string;
  contact_id: string;
  owner_id: string;
}

export const mockContacts: MockContact[] = [
  {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    status: 'new',
    owner_id: 'advisor-test-789',
  },
  {
    id: 'contact-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567891',
    status: 'contacted',
    owner_id: 'advisor-test-789',
  },
];

export const mockDeals: MockDeal[] = [
  {
    id: 'deal-1',
    title: 'Enterprise Deal',
    value: 50000,
    stage: 'proposal',
    contact_id: 'contact-1',
    owner_id: 'advisor-test-789',
  },
];

/**
 * Create a test database pool mock
 * Note: Import vi from vitest when using this function
 */
export function createMockDatabase(vi: any, contacts = mockContacts, deals = mockDeals) {
  return {
    contacts: {
      insert: vi.fn(),
      select: vi.fn().mockResolvedValue({ data: contacts, error: null }),
      update: vi.fn(),
      delete: vi.fn(),
    },
    deals: {
      insert: vi.fn(),
      select: vi.fn().mockResolvedValue({ data: deals, error: null }),
      update: vi.fn(),
      delete: vi.fn(),
    },
    users: {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
}

// Note: vitest import should be used in actual test files

