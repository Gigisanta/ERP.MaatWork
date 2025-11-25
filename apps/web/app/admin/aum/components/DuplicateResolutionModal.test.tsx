import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DuplicateResolutionModal from './DuplicateResolutionModal';

vi.mock('@/lib/api', () => ({
  getAumDuplicates: vi.fn().mockResolvedValue({
    success: true,
    data: {
      ok: true,
      accountNumber: '123',
      hasConflicts: true,
      rows: [
        {
          id: 'r1',
          fileId: 'f1',
          accountNumber: '123',
          holderName: 'John',
          advisorRaw: 'a@a.com',
          advisorNormalized: 'a@a.com',
          matchedContactId: null,
          matchedUserId: null,
          matchStatus: 'unmatched',
          isPreferred: false,
          conflictDetected: true,
          rowCreatedAt: new Date().toISOString(),
        },
        {
          id: 'r2',
          fileId: 'f2',
          accountNumber: '123',
          holderName: 'Jane',
          advisorRaw: 'b@b.com',
          advisorNormalized: 'b@b.com',
          matchedContactId: 'c1',
          matchedUserId: 'u1',
          matchStatus: 'matched',
          isPreferred: true,
          conflictDetected: false,
          rowCreatedAt: new Date().toISOString(),
        },
      ],
    },
  }),
  matchAumRow: vi.fn().mockResolvedValue({ success: true })
}));

describe('DuplicateResolutionModal', () => {
  it('loads duplicates and resolves preferred row', async () => {
    const { matchAumRow } = await import('@/lib/api');
    const onResolved = vi.fn();
    const onClose = vi.fn();
    render(<DuplicateResolutionModal accountNumber="123" onClose={onClose} onResolved={onResolved} />);

    await waitFor(() => screen.getByText(/Duplicados para 123/));

    const options = screen.getAllByRole('radio');
    expect(options.length).toBeGreaterThan(0);

    fireEvent.click(options[0]);

    const saveBtn = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(matchAumRow).toHaveBeenCalled());
    expect(onResolved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});


