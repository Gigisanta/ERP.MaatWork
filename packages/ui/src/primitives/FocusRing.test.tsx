/**
 * Tests para FocusRing primitive
 * 
 * AI_DECISION: Tests unitarios para FocusRing component
 * Justificación: Validación de accesibilidad y focus states
 * Impacto: Prevenir errores en accesibilidad
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusRing } from './FocusRing';

describe('FocusRing', () => {
  it('debería renderizar children correctamente', () => {
    render(
      <FocusRing>
        <button>Test button</button>
      </FocusRing>
    );
    expect(screen.getByText('Test button')).toBeInTheDocument();
  });

  it('debería aplicar clases de focus ring', () => {
    const { container } = render(
      <FocusRing>
        <button>Test</button>
      </FocusRing>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('focus-within:ring-2');
    expect(wrapper.className).toContain('focus-within:ring-blue-500');
    expect(wrapper.className).toContain('focus-within:ring-offset-2');
  });

  it('debería aplicar className custom', () => {
    const { container } = render(
      <FocusRing className="custom-class">
        <button>Test</button>
      </FocusRing>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('debería envolver múltiples children', () => {
    render(
      <FocusRing>
        <input type="text" />
        <button>Submit</button>
      </FocusRing>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('debería mantener estructura de children', () => {
    const { container } = render(
      <FocusRing>
        <div>
          <input type="text" />
          <label>Label</label>
        </div>
      </FocusRing>
    );
    expect(container.querySelector('input')).toBeInTheDocument();
    expect(container.querySelector('label')).toBeInTheDocument();
  });
});


