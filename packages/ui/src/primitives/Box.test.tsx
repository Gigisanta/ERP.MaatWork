/**
 * Tests para Box primitive
 * 
 * AI_DECISION: Tests unitarios para Box component
 * Justificación: Validación de componente base del sistema
 * Impacto: Prevenir errores en componente fundamental
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Box } from './Box';

describe('Box', () => {
  it('debería renderizar como div por defecto', () => {
    render(<Box>Test content</Box>);
    const element = screen.getByText('Test content');
    expect(element.tagName).toBe('DIV');
  });

  it('debería renderizar con elemento custom usando as', () => {
    render(<Box as="section">Test content</Box>);
    const element = screen.getByText('Test content');
    expect(element.tagName).toBe('SECTION');
  });

  it('debería renderizar como span', () => {
    render(<Box as="span">Test content</Box>);
    const element = screen.getByText('Test content');
    expect(element.tagName).toBe('SPAN');
  });

  it('debería aplicar className custom', () => {
    render(<Box className="custom-class">Test</Box>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('custom-class');
  });

  it('debería aplicar display block', () => {
    render(<Box display="block">Test</Box>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('block');
  });

  it('debería aplicar display flex', () => {
    render(<Box display="flex">Test</Box>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('flex');
  });

  it('debería aplicar display grid', () => {
    render(<Box display="grid">Test</Box>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('grid');
  });

  it('debería aplicar display none', () => {
    render(<Box display="none">Test</Box>);
    const element = screen.getByText('Test');
    expect(element.className).toContain('hidden');
  });

  it('debería pasar props adicionales al elemento', () => {
    render(<Box data-testid="box" id="test-id">Test</Box>);
    const element = screen.getByTestId('box');
    expect(element.id).toBe('test-id');
  });

  it('debería renderizar children correctamente', () => {
    render(
      <Box>
        <span>Child 1</span>
        <span>Child 2</span>
      </Box>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});


