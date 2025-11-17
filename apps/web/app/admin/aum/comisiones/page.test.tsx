/**
 * Tests para AumComisionesPage
 * 
 * AI_DECISION: Tests para página de comisiones AUM
 * Justificación: Validar renderizado de página placeholder
 * Impacto: Prevenir errores en visualización
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AumComisionesPage from './page';

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('AumComisionesPage', () => {
  it('debería renderizar página de comisiones AUM', () => {
    render(<AumComisionesPage />);
    
    expect(screen.getByText(/AUM - Comisiones/i)).toBeInTheDocument();
    expect(screen.getByText(/Esta sección está en desarrollo/i)).toBeInTheDocument();
  });

  it('debería mostrar link de vuelta al hub', () => {
    render(<AumComisionesPage />);
    
    const backLink = screen.getByText(/Volver al hub/i);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/admin/aum');
  });

  it('debería mostrar descripción de la página', () => {
    render(<AumComisionesPage />);
    
    expect(screen.getByText(/Gestiona y normaliza datos de comisiones/i)).toBeInTheDocument();
  });
});




