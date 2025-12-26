import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReactNode } from 'react';
import type { AumRow } from '@/types';

const mockGetUserById = vi.fn();

vi.mock('@maatwork/ui', () => ({
  __esModule: true,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
  Modal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  ModalFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  ModalTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Spinner: () => <div data-testid="spinner" />,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/lib/api/users', () => ({
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
}));

const baseRow: AumRow = {
  id: 'row-1',
  fileId: 'file-1',
  accountNumber: '123',
  holderName: 'Cuenta Demo',
  idCuenta: null,
  advisorRaw: 'Giolivo Santarelli',
  advisorNormalized: 'giolivo santarelli',
  matchedContactId: null,
  matchedUserId: 'user-1',
  suggestedUserId: null,
  matchStatus: 'matched',
  isPreferred: true,
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
  file: {
    id: 'file-1',
    broker: 'balanz',
    originalFilename: 'demo.csv',
    mimeType: 'text/csv',
    sizeBytes: 128,
    uploadedByUserId: 'admin-1',
    status: 'parsed',
    totalParsed: 1,
    totalMatched: 1,
    totalUnmatched: 0,
    createdAt: new Date().toISOString(),
  },
  contact: null,
  user: null,
  raw: {},
};

const createRow = (overrides: Partial<AumRow> = {}): AumRow => ({
  ...baseRow,
  ...overrides,
});

describe('AdvisorProfileModal', () => {
  beforeEach(() => {
    mockGetUserById.mockReset();
  });

  it('muestra alias normalizado y carga información del asesor', async () => {
    mockGetUserById.mockResolvedValue({
      success: true,
      data: {
        id: 'user-1',
        email: 'giolivo@example.com',
        fullName: 'Giolivo Santarelli',
        role: 'advisor',
        isActive: true,
      },
    });

    const { default: AdvisorProfileModal } = await import('./AdvisorProfileModal');

    render(<AdvisorProfileModal row={createRow()} open onClose={() => {}} />);

    expect(screen.getByText('Alias normalizado')).toBeInTheDocument();
    expect(screen.getByText('giolivo santarelli')).toBeInTheDocument();

    await waitFor(() => expect(mockGetUserById).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(screen.getByText('giolivo@example.com')).toBeInTheDocument());
    expect(screen.getByText(/Coincidencia/)).toBeInTheDocument();
  });

  it('permite cerrar el modal desde la acción principal', async () => {
    mockGetUserById.mockResolvedValue({ success: true, data: null });
    const onClose = vi.fn();

    const { default: AdvisorProfileModal } = await import('./AdvisorProfileModal');

    render(<AdvisorProfileModal row={createRow()} open onClose={onClose} />);

    await waitFor(() => expect(mockGetUserById).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
