import { describe, it, expect } from 'vitest';
import { breakpoints, type Breakpoint, type ResponsiveProp } from './breakpoints';

describe('breakpoints', () => {
  it('debería exportar todos los breakpoints esperados', () => {
    expect(breakpoints).toHaveProperty('xs');
    expect(breakpoints).toHaveProperty('sm');
    expect(breakpoints).toHaveProperty('md');
    expect(breakpoints).toHaveProperty('lg');
    expect(breakpoints).toHaveProperty('xl');
    expect(breakpoints).toHaveProperty('2xl');
  });

  it('debería tener valores numéricos correctos', () => {
    expect(breakpoints.xs).toBe(360);
    expect(breakpoints.sm).toBe(640);
    expect(breakpoints.md).toBe(768);
    expect(breakpoints.lg).toBe(1024);
    expect(breakpoints.xl).toBe(1280);
    expect(breakpoints['2xl']).toBe(1536);
  });

  it('debería tener breakpoints en orden ascendente', () => {
    const values = Object.values(breakpoints);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('debería tener todos los valores como números positivos', () => {
    Object.values(breakpoints).forEach(value => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });
});

describe('Breakpoint type', () => {
  it('debería aceptar todos los breakpoints válidos', () => {
    const validBreakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    validBreakpoints.forEach(bp => {
      expect(typeof bp).toBe('string');
      expect(breakpoints).toHaveProperty(bp);
    });
  });
});

describe('ResponsiveProp type', () => {
  it('debería aceptar valor simple', () => {
    const simpleValue: ResponsiveProp<string> = 'test';
    expect(simpleValue).toBe('test');
  });

  it('debería aceptar objeto con breakpoints', () => {
    const responsiveValue: ResponsiveProp<number> = {
      base: 10,
      sm: 20,
      md: 30,
      lg: 40
    };
    expect(responsiveValue.base).toBe(10);
    expect(responsiveValue.sm).toBe(20);
  });

  it('debería aceptar objeto con todos los breakpoints', () => {
    const allBreakpoints: ResponsiveProp<string> = {
      base: 'base',
      xs: 'xs',
      sm: 'sm',
      md: 'md',
      lg: 'lg',
      xl: 'xl',
      '2xl': '2xl'
    };
    expect(allBreakpoints.base).toBe('base');
    expect(allBreakpoints['2xl']).toBe('2xl');
  });

  it('debería aceptar objeto con algunos breakpoints undefined', () => {
    const partialBreakpoints: ResponsiveProp<number> = {
      base: 10,
      lg: 40
    };
    expect(partialBreakpoints.base).toBe(10);
    expect(partialBreakpoints.lg).toBe(40);
  });
});

