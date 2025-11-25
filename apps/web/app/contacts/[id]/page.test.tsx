/**
 * Tests for Contact Detail Page
 * 
 * Covers:
 * - Data loading and rendering
 * - 404 error handling
 * - Navigation and breadcrumbs
 * - Section rendering based on data availability
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { notFound } from 'next/navigation';
import ContactDetailPage from './page';
import type { Contact, PipelineStage, Advisor, BrokerAccount, PortfolioAssignment, Task, Note } from '@/types';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useParams: () => ({ id: 'test-contact-id' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock API server
vi.mock('@/lib/api-server', () => ({
  apiCallWithToken: vi.fn(),
}));

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    API_URL: 'http://localhost:3001',
  },
}));

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-token' })),
  })),
}));

describe('ContactDetailPage', () => {
  const mockContact: Contact = {
    id: 'test-contact-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    assignedAdvisorId: 'advisor-1',
    pipelineStageId: 'stage-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
  };

  const mockStage: PipelineStage = {
    id: 'stage-1',
    name: 'Prospecto',
    order: 0,
    color: '#6B7280',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockAdvisor: Advisor = {
    id: 'advisor-1',
    email: 'advisor@example.com',
    fullName: 'Jane Advisor',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render contact details when data is loaded', async () => {
    const { apiCallWithToken } = await import('@/lib/api-server');
    vi.mocked(apiCallWithToken).mockResolvedValue({
      data: mockContact,
    });

    // Mock additional data calls
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockContact });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockStage });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockAdvisor });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] }); // brokerAccounts
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] }); // portfolioAssignments
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] }); // tasks
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] }); // notes

    const page = await ContactDetailPage({ params: { id: 'test-contact-id' } });
    const { container } = render(page);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should call notFound when contact does not exist', async () => {
    const { apiCallWithToken } = await import('@/lib/api-server');
    vi.mocked(apiCallWithToken).mockRejectedValue(new Error('Not found'));

    try {
      await ContactDetailPage({ params: { id: 'non-existent-id' } });
    } catch (error) {
      // Expected to throw or call notFound
    }

    // Verify notFound was called or error was thrown
    expect(notFound).toHaveBeenCalled();
  });

  it('should render breadcrumbs with correct navigation', async () => {
    const { apiCallWithToken } = await import('@/lib/api-server');
    vi.mocked(apiCallWithToken).mockResolvedValue({ data: mockContact });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockContact });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockStage });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockAdvisor });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] });

    const page = await ContactDetailPage({ params: { id: 'test-contact-id' } });
    const { container } = render(page);

    await waitFor(() => {
      const breadcrumbs = container.querySelector('[aria-label="breadcrumb"]');
      expect(breadcrumbs).toBeInTheDocument();
    });
  });

  it('should render all sections when data is available', async () => {
    const { apiCallWithToken } = await import('@/lib/api-server');
    const mockBrokerAccounts: BrokerAccount[] = [{
      id: 'account-1',
      contactId: 'test-contact-id',
      broker: 'IBKR',
      accountNumber: '123456',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }];

    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockContact });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockStage });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockAdvisor });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: mockBrokerAccounts });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] });
    vi.mocked(apiCallWithToken).mockResolvedValueOnce({ data: [] });

    const page = await ContactDetailPage({ params: { id: 'test-contact-id' } });
    const { container } = render(page);

    await waitFor(() => {
      // Verify sections are rendered
      expect(container.querySelector('[data-testid="broker-accounts-section"]') || 
             container.textContent?.includes('Cuentas')).toBeTruthy();
    });
  });
});

