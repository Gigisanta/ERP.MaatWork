
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioComposition } from './PortfolioComposition';

// Mock AssetSearcher as it relies on complex hooks/API
vi.mock('../../components/AssetSearcher', () => ({
  default: () => <div data-testid="asset-searcher">Mock Searcher</div>
}));

describe('PortfolioComposition', () => {
  const mockLines = [
    { id: '1', instrumentName: 'Apple Inc', instrumentSymbol: 'AAPL', targetWeight: 0.5, portfolioId: 'p1', targetType: 'instrument', instrumentId: null },
  ];
  const mockOnAddAsset = vi.fn();
  const mockOnUpdateWeight = vi.fn();
  const mockOnRemoveLine = vi.fn();

  it('debería renderizar la lista de activos', () => {
    render(
      <PortfolioComposition
        lines={mockLines}
        onAddAsset={mockOnAddAsset}
        onUpdateWeight={mockOnUpdateWeight}
        onRemoveLine={mockOnRemoveLine}
      />
    );
    expect(screen.getByText('Apple Inc')).toBeDefined();
  });

  it('debería tener ARIA labels en los inputs de peso', () => {
    render(
      <PortfolioComposition
        lines={mockLines}
        onAddAsset={mockOnAddAsset}
        onUpdateWeight={mockOnUpdateWeight}
        onRemoveLine={mockOnRemoveLine}
      />
    );
    const weightInput = screen.getByLabelText('Peso para Apple Inc');
    expect(weightInput).toBeDefined();
  });

  it('debería llamar a onRemoveLine al clickear eliminar', () => {
    render(
      <PortfolioComposition
        lines={mockLines}
        onAddAsset={mockOnAddAsset}
        onUpdateWeight={mockOnUpdateWeight}
        onRemoveLine={mockOnRemoveLine}
      />
    );
    const deleteBtn = screen.getByLabelText('Eliminar Apple Inc');
    fireEvent.click(deleteBtn);
    expect(mockOnRemoveLine).toHaveBeenCalledWith('1');
  });
});
