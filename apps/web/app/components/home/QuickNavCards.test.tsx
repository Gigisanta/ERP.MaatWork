/**
 * Tests para QuickNavCards component
 *
 * AI_DECISION: Tests unitarios para componente de navegación rápida
 * Justificación: Validación crítica de links y accesibilidad
 * Impacto: Prevenir errores en navegación y UX
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock @cactus/ui antes de importar el componente
vi.mock('@cactus/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  Icon: ({ name, size, className }: any) => (
    <span className={className} data-icon={name}>
      {name}
    </span>
  ),
  Heading: ({ children, level, size, className }: any) => <h3 className={className}>{children}</h3>,
  Text: ({ children, size, color, className }: any) => (
    <span className={className}>{children}</span>
  ),
  Stack: ({ children, direction, gap, align }: any) => <div>{children}</div>,
  Grid: ({ children, cols, gap }: any) => <div>{children}</div>,
  GridItem: ({ children }: any) => <div>{children}</div>,
}));

import { QuickNavCards } from './QuickNavCards';

describe('QuickNavCards', () => {
  it('debería renderizar todas las cards de navegación', () => {
    render(<QuickNavCards />);

    expect(screen.getByText('Contactos')).toBeInTheDocument();
    expect(screen.getByText('Carteras')).toBeInTheDocument();
    expect(screen.getByText('Administración')).toBeInTheDocument();
    expect(screen.getByText('Equipos')).toBeInTheDocument();
  });

  it('debería tener links correctos', () => {
    render(<QuickNavCards />);

    const contactosLink = screen.getByText('Contactos').closest('a');
    expect(contactosLink).toHaveAttribute('href', '/contacts');

    const carterasLink = screen.getByText('Carteras').closest('a');
    expect(carterasLink).toHaveAttribute('href', '/portfolios');

    const adminLink = screen.getByText('Administración').closest('a');
    expect(adminLink).toHaveAttribute('href', '/admin');

    const equiposLink = screen.getByText('Equipos').closest('a');
    expect(equiposLink).toHaveAttribute('href', '/teams');
  });

  it('debería tener descripciones para cada card', () => {
    render(<QuickNavCards />);

    expect(screen.getByText('Gestiona tu red de clientes')).toBeInTheDocument();
    expect(screen.getByText('Analiza el rendimiento de tus carteras')).toBeInTheDocument();
    expect(screen.getByText('Administra usuarios y permisos del sistema')).toBeInTheDocument();
    expect(screen.getByText('Crea y gestiona equipos de trabajo')).toBeInTheDocument();
  });

  it('debería tener aria-labels para accesibilidad', () => {
    render(<QuickNavCards />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toHaveAttribute('aria-label');
      expect(link.getAttribute('aria-label')).toContain('Navegar a');
    });
  });
});
