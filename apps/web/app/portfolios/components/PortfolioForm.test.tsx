
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioForm } from './PortfolioForm';

// Mock components
vi.mock('@maatwork/ui', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Drawer: ({ children, open }: any) => open ? <div>{children}</div> : null,
    // Provide a simpler implementation of Select to avoid validation/portal issues
    Select: ({ label, value, items }: any) => (
      <div>
        <label>{label}</label>
        <select value={value} disabled>
          {items.map((i: any) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </div>
    ),
  };
});

vi.mock('./PortfolioComposition', () => ({
  PortfolioComposition: () => <div data-testid="portfolio-composition">Mock Composition</div>
}));

describe('PortfolioForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  it('debería renderizar título de creación cuando no hay portfolio', () => {
    render(
      <PortfolioForm 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    expect(screen.getByText('Crear Nueva Cartera')).toBeDefined();
  });

  it('debería tener ARIA label en el botón de cerrar', () => {
    render(
      <PortfolioForm 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    const closeBtn = screen.getByLabelText('Cerrar');
    expect(closeBtn).toBeDefined();
  });
});
