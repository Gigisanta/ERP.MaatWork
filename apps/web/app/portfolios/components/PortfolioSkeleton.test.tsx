
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PortfolioSkeleton } from './PortfolioSkeleton';

describe('PortfolioSkeleton', () => {
  it('debería renderizar sin errores', () => {
    const { container } = render(<PortfolioSkeleton />);
    expect(container.firstChild).toBeDefined();
  });
});
