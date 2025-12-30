/**
 * Tests para AppShell component
 *
 * AI_DECISION: Tests unitarios para AppShell
 * Justificación: Validación de shell principal de la aplicación
 * Impacto: Prevenir errores en estructura principal
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AppShell from './AppShell';

import React from 'react';

// Mock UI components
vi.mock('@maatwork/ui', () => ({
  Drawer: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="drawer" data-open={open}>
      {children}
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ),
  Sidebar: ({ sections }: { sections: Array<{ title: string }> }) => (
    <nav data-testid="sidebar">
      {sections.map((section) => (
        <div key={section.title}>{section.title}</div>
      ))}
    </nav>
  ),
}));

// Mock NavigationNew
vi.mock('./NavigationNew', () => ({
  default: ({
    onToggleSidebar,
    sidebarOpen,
  }: {
    onToggleSidebar: () => void;
    sidebarOpen: boolean;
  }) => (
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

  it('debería toggle sidebar cuando se hace click en NavigationNew', async () => {
    render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    const toggleButton = screen.getByText('Toggle Sidebar');
    const drawer = screen.getByTestId('drawer');

    expect(drawer.getAttribute('data-open')).toBe('false');

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(drawer.getAttribute('data-open')).toBe('true');
  });

  it('debería cerrar drawer cuando se hace click en close', async () => {
    render(
      <AppShell>
        <div>Test</div>
      </AppShell>
    );

    const toggleButton = screen.getByText('Toggle Sidebar');
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    const drawer = screen.getByTestId('drawer');
    expect(drawer.getAttribute('data-open')).toBe('true');

    const closeButton = screen.getByText('Close');
    await act(async () => {
      fireEvent.click(closeButton);
    });

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
