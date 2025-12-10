/**
 * Tests para Heading primitive
 *
 * AI_DECISION: Tests unitarios para Heading component
 * Justificación: Validación de componente de headings
 * Impacto: Prevenir errores en jerarquía de headings
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from './Heading';

describe('Heading', () => {
  it('debería renderizar como h1 por defecto', () => {
    render(<Heading>Test content</Heading>);
    const element = screen.getByText('Test content');
    expect(element.tagName).toBe('H1');
  });

  describe('level prop', () => {
    it('debería renderizar h1 cuando level es 1', () => {
      render(<Heading level={1}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H1');
    });

    it('debería renderizar h2 cuando level es 2', () => {
      render(<Heading level={2}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H2');
    });

    it('debería renderizar h3 cuando level es 3', () => {
      render(<Heading level={3}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H3');
    });

    it('debería renderizar h4 cuando level es 4', () => {
      render(<Heading level={4}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H4');
    });

    it('debería renderizar h5 cuando level es 5', () => {
      render(<Heading level={5}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H5');
    });

    it('debería renderizar h6 cuando level es 6', () => {
      render(<Heading level={6}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H6');
    });
  });

  describe('as prop', () => {
    it('debería usar as prop cuando está definida', () => {
      render(
        <Heading as="h2" level={1}>
          Test
        </Heading>
      );
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H2');
    });

    it('debería priorizar as sobre level', () => {
      render(
        <Heading as="h3" level={1}>
          Test
        </Heading>
      );
      const element = screen.getByText('Test');
      expect(element.tagName).toBe('H3');
    });
  });

  describe('styling by level', () => {
    it('debería aplicar estilos para level 1', () => {
      render(<Heading level={1}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-4xl');
      expect(element.className).toContain('font-bold');
    });

    it('debería aplicar estilos para level 2', () => {
      render(<Heading level={2}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-3xl');
      expect(element.className).toContain('font-bold');
    });

    it('debería aplicar estilos para level 3', () => {
      render(<Heading level={3}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-2xl');
      expect(element.className).toContain('font-semibold');
    });

    it('debería aplicar estilos para level 4', () => {
      render(<Heading level={4}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-xl');
      expect(element.className).toContain('font-semibold');
    });

    it('debería aplicar estilos para level 5', () => {
      render(<Heading level={5}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-lg');
      expect(element.className).toContain('font-medium');
    });

    it('debería aplicar estilos para level 6', () => {
      render(<Heading level={6}>Test</Heading>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-base');
      expect(element.className).toContain('font-medium');
    });
  });

  it('debería aplicar className custom', () => {
    render(<Heading className="custom-class">Test</Heading>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('custom-class');
  });

  it('debería pasar props adicionales', () => {
    render(
      <Heading data-testid="heading" id="test-id">
        Test
      </Heading>
    );
    const element = screen.getByTestId('heading');
    expect(element.id).toBe('test-id');
  });

  it('debería renderizar children correctamente', () => {
    render(<Heading>Child content</Heading>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
