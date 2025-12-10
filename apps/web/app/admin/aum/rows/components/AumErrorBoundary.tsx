/**
 * AumErrorBoundary Component
 *
 * AI_DECISION: Error boundary específico para AUM con reintentos y mensajes contextuales
 * Justificación: Captura errores de SWR y componentes, evita crash de la aplicación
 * Impacto: Mejor UX, mensajes de error claros, opción de retry
 */

'use client';

import { Component, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Text } from '@cactus/ui';
import { parseErrorMessage } from '../lib/aumRowsUtils';
import { logger } from '@/lib/logger';

interface AumErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface AumErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: unknown;
}

/**
 * Componente funcional interno para botones de navegación en Error Boundary
 * Necesario porque componentes de clase no pueden usar hooks directamente
 */
function ErrorBoundaryActions({ onReset }: { onReset: () => void }) {
  const router = useRouter();

  const handleGoToHub = () => {
    router.push('/admin/aum');
  };

  return (
    <div className="flex gap-3 justify-center">
      <Button onClick={onReset}>🔄 Reintentar</Button>
      <Button variant="outline" onClick={handleGoToHub}>
        ← Volver al hub
      </Button>
    </div>
  );
}

export class AumErrorBoundary extends Component<AumErrorBoundaryProps, AumErrorBoundaryState> {
  constructor(props: AumErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AumErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    logger.error('AUM Error Boundary capturó un error', {
      error: error.message,
      errorStack: error.stack,
      errorInfo: errorInfo instanceof Error ? errorInfo.message : String(errorInfo),
      componentStack:
        typeof errorInfo === 'object' && errorInfo !== null && 'componentStack' in errorInfo
          ? String(errorInfo.componentStack)
          : undefined,
    });
    this.setState({
      error,
      errorInfo: errorInfo as unknown,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    } else {
      // Default: reload page using router.refresh() via component
      // Note: For full page reload, we still need window.location.reload()
      // but router.refresh() is preferred for Next.js app router
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const errorMessage = this.state.error
        ? parseErrorMessage(this.state.error)
        : 'Ha ocurrido un error inesperado';

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error en AUM Rows</h2>
              <Text size="sm" className="text-gray-600 mb-6">
                {errorMessage}
              </Text>

              {/* Stack trace in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mb-6 p-4 bg-gray-50 rounded text-xs">
                  <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                    Detalles técnicos (development only)
                  </summary>
                  <pre className="whitespace-pre-wrap text-gray-600">
                    {this.state.error.toString()}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <ErrorBoundaryActions onReset={this.handleReset} />
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary fallback for SWR errors
 */
export function AumErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const errorMessage = parseErrorMessage(error);

  const handleReload = () => {
    router.refresh();
  };

  return (
    <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className="text-3xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error cargando datos</h3>
          <Text size="sm" className="text-gray-600 mb-4">
            {errorMessage}
          </Text>
          <div className="flex gap-2">
            <Button size="sm" onClick={reset}>
              🔄 Reintentar
            </Button>
            <Button size="sm" variant="outline" onClick={handleReload}>
              Recargar página
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
