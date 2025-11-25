/**
 * Tests for AUM Hub Page
 * 
 * Covers:
 * - Rendering of navigation sections
 * - Link navigation
 * - Card rendering
 */

import { describe, it, expect } from 'vitest';
// Vitest globals are enabled in vitest.config.ts
import { render, screen } from '@testing-library/react';
import AumHubPage from './page';

describe('AumHubPage', () => {
  it('should render page title', () => {
    render(<AumHubPage />);
    expect(screen.getByText('AUM y Brokers')).toBeInTheDocument();
  });

  it('should render both AUM sections', () => {
    render(<AumHubPage />);
    expect(screen.getByText('AUM - Comisiones')).toBeInTheDocument();
    expect(screen.getByText('AUM - Filas y Cuentas')).toBeInTheDocument();
  });

  it('should render links to sections', () => {
    render(<AumHubPage />);
    const comisionesLink = screen.getByRole('link', { name: /comisiones/i });
    const rowsLink = screen.getByRole('link', { name: /filas y cuentas/i });
    
    expect(comisionesLink).toHaveAttribute('href', '/admin/aum/comisiones');
    expect(rowsLink).toHaveAttribute('href', '/admin/aum/rows');
  });

  it('should render section descriptions', () => {
    render(<AumHubPage />);
    expect(screen.getByText(/Gestiona y normaliza datos de comisiones/i)).toBeInTheDocument();
    expect(screen.getByText(/Normalización y sincronización/i)).toBeInTheDocument();
  });
});

