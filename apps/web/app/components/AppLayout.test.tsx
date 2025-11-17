/**
 * Tests para AppLayout component
 * 
 * AI_DECISION: Tests unitarios para AppLayout
 * Justificación: Validación de layout principal
 * Impacto: Prevenir errores en estructura de página
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppLayout from './AppLayout';
import { SidebarProvider } from './SidebarContext';

describe('AppLayout', () => {
  it('debería renderizar children correctamente', () => {
    render(
      <SidebarProvider>
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      </SidebarProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('debería aplicar clase de margen cuando sidebar está colapsado', () => {
    const { container } = render(
      <SidebarProvider defaultCollapsed={true}>
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      </SidebarProvider>
    );

    const main = container.querySelector('main');
    expect(main?.className).toContain('lg:ml-14');
  });

  it('debería aplicar clase de margen cuando sidebar no está colapsado', () => {
    const { container } = render(
      <SidebarProvider defaultCollapsed={false}>
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      </SidebarProvider>
    );

    const main = container.querySelector('main');
    expect(main?.className).toContain('lg:ml-48');
  });

  it('debería aplicar clases de transición', () => {
    const { container } = render(
      <SidebarProvider>
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      </SidebarProvider>
    );

    const main = container.querySelector('main');
    expect(main?.className).toContain('transition-all');
    expect(main?.className).toContain('duration-300');
  });

  it('debería aplicar clases de background y padding', () => {
    const { container } = render(
      <SidebarProvider>
        <AppLayout>
          <div>Test</div>
        </AppLayout>
      </SidebarProvider>
    );

    const main = container.querySelector('main');
    expect(main?.className).toContain('bg-background');
    expect(main?.className).toContain('lg:pt-4');
  });
});


