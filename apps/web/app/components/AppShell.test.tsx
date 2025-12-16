/**
 * Tests para AppShell component
 *
 * AI_DECISION: Tests unitarios para AppShell
 * Justificación: Validación de shell principal de la aplicación
 * Impacto: Prevenir errores en estructura principal
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppShell from './AppShell';

// Mock UI components
vi.mock('@cactus/ui', () => ({
  Drawer: ({ children, open, onOpenChange }: any) => (
    <div data-testid="drawer" data-open={open}>
      {children}
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ),
  Sidebar: ({ sections }: any) => (
    <nav data-testid="sidebar">
      {sections.map((section: any) => (
        <div key={section.title}>{section.title}</div>
      ))}
    </nav>
  ),
}));

// Mock NavigationNew
vi.mock('./NavigationNew', () => ({
  default: ({ onToggleSidebar, sidebarOpen }: any) => (
    <nav data-testid="navigation">
      <button onClick={onToggleSidebar} data-open={sidebarOpen}>
        Toggle Sidebar
      </button>
    </nav>
  ),
}));

describe('AppShell', () => {
  it('debería renderizar children correctamente', () => {
    render(
      <AppShell>
        <div>Test content</div>
      </AppShell>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('debería renderizar NavigationNew', () => {
    render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('debería renderizar Sidebar en desktop', () => {
    render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    const sidebars = screen.getAllByTestId('sidebar');
    expect(sidebars.length).toBeGreaterThan(0);
  });

  it('debería renderizar Drawer para mobile', () => {
    render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('debería toggle sidebar cuando se hace click en NavigationNew', () => {
    render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    const toggleButton = screen.getByText('Toggle Sidebar');
    const drawer = screen.getByTestId('drawer');

    expect(drawer.getAttribute('data-open')).toBe('false');

    toggleButton.click();

    expect(drawer.getAttribute('data-open')).toBe('true');
  });

  it('debería cerrar drawer cuando se hace click en close', () => {
    render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    const toggleButton = screen.getByText('Toggle Sidebar');
    toggleButton.click();

    const drawer = screen.getByTestId('drawer');
    expect(drawer.getAttribute('data-open')).toBe('true');

    const closeButton = screen.getByText('Close');
    closeButton.click();

    expect(drawer.getAttribute('data-open')).toBe('false');
  });

  it('debería aplicar grid layout', () => {
    const { container } = render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid');
    expect(root.className).toContain('grid-cols-1');
    expect(root.className).toContain('lg:grid-cols-[240px_1fr]');
  });
});
