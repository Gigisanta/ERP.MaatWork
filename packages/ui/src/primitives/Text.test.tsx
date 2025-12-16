/**
 * Tests para Text primitive
 *
 * AI_DECISION: Tests unitarios para Text component
 * Justificación: Validación de componente de texto base
 * Impacto: Prevenir errores en tipografía
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from './Text';

describe('Text', () => {
  it('debería renderizar como p por defecto', () => {
    render(<Text>Test content</Text>);
    const element = screen.getByText('Test content');
    expect(element.tagName).toBe('P');
  });

  it('debería renderizar con elemento custom usando as', () => {
    render(<Text as="span">Test content</Text>);
    const element = screen.getByText('Test content');
    expect(element.tagName).toBe('SPAN');
  });

  describe('size variants', () => {
    it('debería aplicar size xs', () => {
      render(<Text size="xs">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-xs');
    });

    it('debería aplicar size sm', () => {
      render(<Text size="sm">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-sm');
    });

    it('debería aplicar size base por defecto', () => {
      render(<Text>Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-base');
    });

    it('debería aplicar size lg', () => {
      render(<Text size="lg">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-lg');
    });

    it('debería aplicar size xl', () => {
      render(<Text size="xl">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-xl');
    });
  });

  describe('weight variants', () => {
    it('debería aplicar weight normal por defecto', () => {
      render(<Text>Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('font-normal');
    });

    it('debería aplicar weight medium', () => {
      render(<Text weight="medium">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('font-medium');
    });

    it('debería aplicar weight semibold', () => {
      render(<Text weight="semibold">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('font-semibold');
    });

    it('debería aplicar weight bold', () => {
      render(<Text weight="bold">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('font-bold');
    });
  });

  describe('color variants', () => {
    it('debería aplicar color primary por defecto', () => {
      render(<Text>Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-text');
    });

    it('debería aplicar color secondary', () => {
      render(<Text color="secondary">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-text-secondary');
    });

    it('debería aplicar color muted', () => {
      render(<Text color="muted">Test</Text>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('text-text-muted');
    });
  });

  it('debería aplicar className custom', () => {
    render(<Text className="custom-class">Test</Text>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('custom-class');
  });

  it('debería pasar props adicionales', () => {
    render(
      <Text data-testid="text" id="test-id">
        Test
      </Text>
    );
    const element = screen.getByTestId('text');
    expect(element.id).toBe('test-id');
  });

  it('debería renderizar children correctamente', () => {
    render(<Text>Child content</Text>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
