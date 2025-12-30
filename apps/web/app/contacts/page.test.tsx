/**
 * Tests para contacts page
 *
 * AI_DECISION: Tests unitarios básicos para contacts page
 * Justificación: Validación de renderizado básico
 * Impacto: Prevenir errores críticos en página principal
 */
import { usePageTitle } from '../components/PageTitleContext';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ContactsPage', () => {
  it('debería renderizar correctamente', () => {
    render(<ContactsPage />);

    // Verificar que la página se renderiza sin errores buscando el título
    expect(screen.getByText(/Contactos/i)).toBeInTheDocument();
  });

  it('debería mostrar título de página', () => {
    render(<ContactsPage />);

    expect(usePageTitle).toHaveBeenCalledWith('Contactos');
  });
});
