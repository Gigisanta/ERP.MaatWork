/**
 * Tests para Grid primitive
 * 
 * AI_DECISION: Tests unitarios para Grid y GridItem components
 * Justificación: Validación de componente de grid layout
 * Impacto: Prevenir errores en layouts de grid
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid, GridItem } from './Grid';

describe('Grid', () => {
  it('debería renderizar correctamente', () => {
    render(<Grid>Test content</Grid>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('debería aplicar grid class', () => {
    render(<Grid>Test</Grid>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('grid');
  });

  describe('cols', () => {
    it('debería aplicar cols 1 por defecto', () => {
      render(<Grid>Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('grid-cols-1');
    });

    it('debería aplicar cols 2', () => {
      render(<Grid cols={2}>Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('grid-cols-2');
    });

    it('debería aplicar cols 3', () => {
      render(<Grid cols={3}>Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('grid-cols-3');
    });

    it('debería aplicar cols 4', () => {
      render(<Grid cols={4}>Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('grid-cols-4');
    });

    it('debería aplicar cols 6', () => {
      render(<Grid cols={6}>Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('grid-cols-6');
    });

    it('debería aplicar cols 12', () => {
      render(<Grid cols={12}>Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('grid-cols-12');
    });
  });

  describe('gap', () => {
    it('debería aplicar gap md por defecto', () => {
      render(<Grid>Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-4');
    });

    it('debería aplicar gap xs', () => {
      render(<Grid gap="xs">Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-1');
    });

    it('debería aplicar gap sm', () => {
      render(<Grid gap="sm">Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-2');
    });

    it('debería aplicar gap lg', () => {
      render(<Grid gap="lg">Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-6');
    });

    it('debería aplicar gap xl', () => {
      render(<Grid gap="xl">Test</Grid>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('gap-8');
    });
  });

  it('debería aplicar className custom', () => {
    render(<Grid className="custom-class">Test</Grid>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('custom-class');
  });

  it('debería pasar props HTML adicionales', () => {
    render(<Grid data-testid="grid" id="test-id">Test</Grid>);
    const element = screen.getByTestId('grid');
    expect(element.id).toBe('test-id');
  });
});

describe('GridItem', () => {
  it('debería renderizar correctamente', () => {
    render(<GridItem>Test content</GridItem>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  describe('colSpan', () => {
    it('debería aplicar colSpan 1 por defecto', () => {
      render(<GridItem>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('col-span-1');
    });

    it('debería aplicar colSpan 2', () => {
      render(<GridItem colSpan={2}>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('col-span-2');
    });

    it('debería aplicar colSpan 3', () => {
      render(<GridItem colSpan={3}>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('col-span-3');
    });

    it('debería aplicar colSpan 6', () => {
      render(<GridItem colSpan={6}>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('col-span-6');
    });

    it('debería aplicar colSpan 12', () => {
      render(<GridItem colSpan={12}>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('col-span-12');
    });
  });

  describe('rowSpan', () => {
    it('debería aplicar rowSpan 1 por defecto', () => {
      render(<GridItem>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('row-span-1');
    });

    it('debería aplicar rowSpan 2', () => {
      render(<GridItem rowSpan={2}>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('row-span-2');
    });

    it('debería aplicar rowSpan 3', () => {
      render(<GridItem rowSpan={3}>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('row-span-3');
    });

    it('debería aplicar rowSpan 6', () => {
      render(<GridItem rowSpan={6}>Test</GridItem>);
      const element = screen.getByText('Test');
      expect(element.className).toContain('row-span-6');
    });
  });

  it('debería aplicar className custom', () => {
    render(<GridItem className="custom-class">Test</GridItem>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('custom-class');
  });

  it('debería pasar props HTML adicionales', () => {
    render(<GridItem data-testid="grid-item" id="test-id">Test</GridItem>);
    const element = screen.getByTestId('grid-item');
    expect(element.id).toBe('test-id');
  });

  it('debería combinar colSpan y rowSpan', () => {
    render(<GridItem colSpan={3} rowSpan={2}>Test</GridItem>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('col-span-3');
    expect(element.className).toContain('row-span-2');
  });
});


