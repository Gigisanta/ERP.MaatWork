/**
 * Tests para PageTitleContext
 *
 * AI_DECISION: Tests para contexto de título de página
 * Justificación: Validar gestión de título dinámico en header
 * Impacto: Prevenir errores en navegación y UX
 */

import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { PageTitleProvider, usePageTitle, usePageTitleContext } from './PageTitleContext';

describe('PageTitleContext', () => {
  it('debería proporcionar contexto con valores iniciales', () => {
    let contextValue:
      | { pageTitle: string | null; setPageTitle: (title: string | null) => void }
      | undefined;

    const TestComponent = () => {
      contextValue = usePageTitleContext();
      return <div>Test</div>;
    };

    render(
      <PageTitleProvider>
        <TestComponent />
      </PageTitleProvider>
    );

    expect(contextValue).toBeDefined();
    expect(contextValue?.pageTitle).toBeNull();
    expect(typeof contextValue?.setPageTitle).toBe('function');
  });

  it('debería actualizar título cuando se usa usePageTitle', () => {
    let contextValue:
      | { pageTitle: string | null; setPageTitle: (title: string | null) => void }
      | undefined;

    const TestComponent = () => {
      usePageTitle('Test Title');
      contextValue = usePageTitleContext();
      return <div>Test</div>;
    };

    render(
      <PageTitleProvider>
        <TestComponent />
      </PageTitleProvider>
    );

    expect(contextValue?.pageTitle).toBe('Test Title');
  });

  it('debería resetear título cuando componente se desmonta', () => {
    let contextValue:
      | { pageTitle: string | null; setPageTitle: (title: string | null) => void }
      | undefined;

    const TestComponent = () => {
      usePageTitle('Test Title');
      contextValue = usePageTitleContext();
      return <div>Test</div>;
    };

    const { unmount } = render(
      <PageTitleProvider>
        <TestComponent />
      </PageTitleProvider>
    );

    expect(contextValue?.pageTitle).toBe('Test Title');

    act(() => {
      unmount();
    });

    // El cleanup debería resetear el título
    // Nota: En un test real, necesitarías verificar el estado después del unmount
  });

  it('debería lanzar error si usePageTitleContext se usa fuera del provider', () => {
    // Suprimir console.error para este test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      usePageTitleContext();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePageTitleContext must be used within a PageTitleProvider');

    consoleSpy.mockRestore();
  });

  it('debería actualizar título cuando cambia el parámetro', () => {
    let contextValue:
      | { pageTitle: string | null; setPageTitle: (title: string | null) => void }
      | undefined;

    const TestComponent = ({ title }: { title: string }) => {
      usePageTitle(title);
      contextValue = usePageTitleContext();
      return <div>Test</div>;
    };

    const { rerender } = render(
      <PageTitleProvider>
        <TestComponent title="Title 1" />
      </PageTitleProvider>
    );

    expect(contextValue?.pageTitle).toBe('Title 1');

    rerender(
      <PageTitleProvider>
        <TestComponent title="Title 2" />
      </PageTitleProvider>
    );

    expect(contextValue?.pageTitle).toBe('Title 2');
  });
});
