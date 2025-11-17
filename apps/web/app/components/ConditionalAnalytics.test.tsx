/**
 * Tests para ConditionalAnalytics component
 * 
 * AI_DECISION: Tests unitarios para carga condicional de Analytics
 * Justificación: Validación crítica de feature flags y carga condicional
 * Impacto: Prevenir carga innecesaria de Analytics en desarrollo
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConditionalAnalytics } from './ConditionalAnalytics';

// Mock dependencies
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="analytics">Analytics</div>
}));

describe('ConditionalAnalytics', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalNextPublicEnableAnalytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalNextPublicEnableAnalytics !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = originalNextPublicEnableAnalytics;
    } else {
      delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    }
  });

  it('no debería cargar Analytics en desarrollo por defecto', () => {
    process.env.NODE_ENV = 'development';
    
    render(<ConditionalAnalytics />);
    
    expect(screen.queryByTestId('analytics')).not.toBeInTheDocument();
  });

  it('debería cargar Analytics cuando NEXT_PUBLIC_ENABLE_ANALYTICS=true en desarrollo', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    
    render(<ConditionalAnalytics />);
    
    expect(screen.getByTestId('analytics')).toBeInTheDocument();
  });

  it('no debería cargar Analytics cuando NEXT_PUBLIC_ENABLE_ANALYTICS=false en producción', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'false';
    
    render(<ConditionalAnalytics />);
    
    expect(screen.queryByTestId('analytics')).not.toBeInTheDocument();
  });

  it('debería cargar Analytics en producción por defecto', () => {
    process.env.NODE_ENV = 'production';
    
    render(<ConditionalAnalytics />);
    
    expect(screen.getByTestId('analytics')).toBeInTheDocument();
  });

  it('debería cargar Analytics cuando NEXT_PUBLIC_ENABLE_ANALYTICS=true en producción', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    
    render(<ConditionalAnalytics />);
    
    expect(screen.getByTestId('analytics')).toBeInTheDocument();
  });
});

