/**
 * Tests para Stack primitive
 *
 * AI_DECISION: Tests unitarios para Stack component
 * Justificación: Validación de componente de layout
 * Impacto: Prevenir errores en layouts flex
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from './Stack';

describe('Stack', () => {
  it('debería renderizar correctamente', () => {
    render(<Stack>Test content</Stack>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('debería aplicar flex por defecto', () => {
    render(<Stack>Test</Stack>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('flex');
  });

  describe('direction', () => {
    it('debería aplicar direction column por defecto', () => {
      render(<Stack>Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('flex-col');
    });

    it('debería aplicar direction row', () => {
      render(<Stack direction="row">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('flex-row');
    });
  });

  describe('gap', () => {
    it('debería aplicar gap md por defecto', () => {
      render(<Stack>Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-4');
    });

    it('debería aplicar gap xs', () => {
      render(<Stack gap="xs">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-1');
    });

    it('debería aplicar gap sm', () => {
      render(<Stack gap="sm">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-2');
    });

    it('debería aplicar gap lg', () => {
      render(<Stack gap="lg">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-6');
    });

    it('debería aplicar gap xl', () => {
      render(<Stack gap="xl">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-8');
    });
  });

  describe('align', () => {
    it('debería aplicar align stretch por defecto', () => {
      render(<Stack>Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('items-stretch');
    });

    it('debería aplicar align start', () => {
      render(<Stack align="start">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('items-start');
    });

    it('debería aplicar align center', () => {
      render(<Stack align="center">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('items-center');
    });

    it('debería aplicar align end', () => {
      render(<Stack align="end">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('items-end');
    });
  });

  describe('justify', () => {
    it('debería aplicar justify start por defecto', () => {
      render(<Stack>Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('justify-start');
    });

    it('debería aplicar justify center', () => {
      render(<Stack justify="center">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('justify-center');
    });

    it('debería aplicar justify end', () => {
      render(<Stack justify="end">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('justify-end');
    });

    it('debería aplicar justify between', () => {
      render(<Stack justify="between">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('justify-between');
    });

    it('debería aplicar justify around', () => {
      render(<Stack justify="around">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('justify-around');
    });

    it('debería aplicar justify evenly', () => {
      render(<Stack justify="evenly">Test</Stack>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('justify-evenly');
    });
  });

  it('debería aplicar className custom', () => {
    render(<Stack className="custom-class">Test</Stack>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('custom-class');
  });

  it('debería pasar props HTML adicionales', () => {
    render(
      <Stack data-testid="stack" id="test-id">
        Test
      </Stack>
    );
    const element = screen.getByTestId('stack');
    expect(element.id).toBe('test-id');
  });

  it('debería renderizar children correctamente', () => {
    render(
      <Stack>
        <div>Child 1</div>
        <div>Child 2</div>
      </Stack>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});
