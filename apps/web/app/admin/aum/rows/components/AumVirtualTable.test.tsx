import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { AumRow } from '@/types';
import { AumVirtualTable } from './AumVirtualTable';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [
      {
        index: 0,
        start: 0,
        end: 60,
      },
    ],
    getTotalSize: () => 60,
  }),
}));

vi.mock('@maatwork/ui', () => ({
  Text: ({ children, ...rest }: { children: ReactNode }) => <span {...rest}>{children}</span>,
  Button: ({ children, ...rest }: { children: ReactNode }) => <button {...rest}>{children}</button>,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const showToastMock = vi.fn();

vi.mock('@/lib/hooks/useToast', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

const createRow = (overrides: Partial<AumRow> = {}): AumRow => ({
  id: 'row-1',
  fileId: 'file-1',
  accountNumber: '123',
  holderName: 'Cuenta Demo',
  idCuenta: 'ACC-1',
  advisorRaw: 'Advisor',
  advisorNormalized: 'advisor',
  matchedContactId: null,
  matchedUserId: null,
  suggestedUserId: null,
  matchStatus: 'unmatched',
  isPreferred: false,
  conflictDetected: false,
  needsConfirmation: false,
  rowCreatedAt: new Date().toISOString(),
  aumDollars: 100,
  bolsaArg: null,
  fondosArg: null,
  bolsaBci: null,
  pesos: null,
  mep: null,
  cable: null,
  cv7000: null,
  contact: null,
  user: null,
  raw: {},
  ...overrides,
});

describe('AumVirtualTable', () => {
  const defaultProps = {
    onOpenAdvisorModal: vi.fn(),
    onShowDuplicates: vi.fn(),
    onAdvisorUpdated: vi.fn(),
  };

  it('renders loading skeleton while data is loading', () => {
    render(<AumVirtualTable rows={[]} isLoading error={null} {...defaultProps} />);

    expect(screen.getByTestId('aum-table-loading')).toBeInTheDocument();
  });

  it('renders empty state when there are no rows', () => {
    render(<AumVirtualTable rows={[]} isLoading={false} error={null} {...defaultProps} />);

    expect(screen.getByTestId('aum-table-empty')).toBeInTheDocument();
    expect(screen.getByText(/No se encontraron filas/i)).toBeInTheDocument();
  });

  it('renders rows when data is available', () => {
    render(
      <AumVirtualTable rows={[createRow()]} isLoading={false} error={null} {...defaultProps} />
    );

    expect(screen.getByText('Cuenta Demo')).toBeInTheDocument();
  });
});
