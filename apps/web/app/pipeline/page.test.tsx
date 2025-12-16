/**
 * Tests para pipeline page
 *
 * AI_DECISION: Tests unitarios básicos para pipeline page
 * Justificación: Validación de renderizado básico
 * Impacto: Prevenir errores críticos en página de pipeline
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PipelinePage from './page';

// Mock dependencies
vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', role: 'admin' },
    loading: false,
  }),
}));

vi.mock('../../lib/api-hooks', () => ({
  usePipelineBoard: () => ({
    stages: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn(),
}));

describe('PipelinePage', () => {
  it('debería renderizar correctamente', () => {
    render(<PipelinePage />);

    // Verificar que la página se renderiza sin errores
    expect(document.body).toBeDefined();
  });

  it('debería mostrar título de página', () => {
    const { usePageTitle } = require('../components/PageTitleContext');
    render(<PipelinePage />);

    expect(usePageTitle).toHaveBeenCalledWith('Pipeline de Ventas');
  });
});
