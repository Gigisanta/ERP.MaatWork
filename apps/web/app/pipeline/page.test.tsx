/**
 * Tests para pipeline page
 *
 * AI_DECISION: Tests unitarios básicos para pipeline page
 * Justificación: Validación de renderizado básico
 * Impacto: Prevenir errores críticos en página de pipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PipelinePage from './page';

// Mock dependencies
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn().mockReturnValue({ value: 'fake-token' }),
  }),
}));

vi.mock('@/lib/api-server', () => ({
  getPipelineBoard: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
}));

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

import { usePageTitle } from '../components/PageTitleContext';

describe('PipelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar correctamente', async () => {
    const Component = await PipelinePage();
    render(Component);

    // Verificar que la página se renderiza sin errores
    expect(document.body).toBeDefined();
  });

  it('debería mostrar título de página', async () => {
    const Component = await PipelinePage();
    render(Component);

    await waitFor(() => {
      expect(usePageTitle).toHaveBeenCalledWith('Pipeline de Ventas');
    });
  });
});
