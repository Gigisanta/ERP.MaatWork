/**
 * Tests para VisuallyHidden primitive
 * 
 * AI_DECISION: Tests unitarios para VisuallyHidden component
 * Justificación: Validación crítica de accesibilidad
 * Impacto: Prevenir errores en screen readers
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('debería renderizar como span', () => {
    render(<VisuallyHidden>Test content</VisuallyHidden>);
    const element = screen.getByText('Test content');
    expect(element.tagName).toBe('SPAN');
  });

  it('debería aplicar clase sr-only', () => {
    render(<VisuallyHidden>Test</VisuallyHidden>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('sr-only');
  });

  it('debería renderizar children correctamente', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);
    expect(screen.getByText('Hidden text')).toBeInTheDocument();
  });

  it('debería ser accesible para screen readers', () => {
    render(
      <button>
        <VisuallyHidden>Screen reader text</VisuallyHidden>
        <span aria-hidden="true">Visible text</span>
      </button>
    );
    
    const hiddenText = screen.getByText('Screen reader text');
    expect(hiddenText).toBeInTheDocument();
    // sr-only hace que el texto sea accesible pero visualmente oculto
    expect(hiddenText.className).toContain('sr-only');
  });

  it('debería renderizar múltiples children', () => {
    render(
      <VisuallyHidden>
        <span>Text 1</span>
        <span>Text 2</span>
      </VisuallyHidden>
    );
    expect(screen.getByText('Text 1')).toBeInTheDocument();
    expect(screen.getByText('Text 2')).toBeInTheDocument();
  });
});


