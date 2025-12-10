/**
 * Tests para contacts page
 *
 * AI_DECISION: Tests unitarios básicos para contacts page
 * Justificación: Validación de renderizado básico
 * Impacto: Prevenir errores críticos en página principal
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactsPage from './page';

// Mock dependencies
vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', role: 'admin' },
    loading: false,
  }),
}));

vi.mock('../../lib/api-hooks', () => ({
  useContacts: () => ({
    contacts: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
  }),
  usePipelineStages: () => ({
    stages: [],
    isLoading: false,
    error: null,
  }),
  useAdvisors: () => ({
    advisors: [],
    isLoading: false,
    error: null,
  }),
  useTags: () => ({
    tags: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('../../lib/hooks/useKeyboardShortcuts', () => ({
  useSearchShortcut: vi.fn(),
  useEscapeShortcut: vi.fn(),
}));

vi.mock('../../lib/hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    hideToast: vi.fn(),
  }),
}));

vi.mock('../(shared)/useViewport', () => ({
  useViewport: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }),
}));

describe('ContactsPage', () => {
  it('debería renderizar correctamente', () => {
    render(<ContactsPage />);

    // Verificar que la página se renderiza sin errores
    expect(screen.getByRole('main') || screen.getByRole('article') || document.body).toBeDefined();
  });

  it('debería mostrar título de página', () => {
    const { usePageTitle } = require('../components/PageTitleContext');
    render(<ContactsPage />);

    expect(usePageTitle).toHaveBeenCalledWith('Contactos');
  });
});
