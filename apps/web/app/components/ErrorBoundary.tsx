'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '../../lib/logger';
import { Toast, Button } from '@maatwork/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Componente funcional interno para mostrar errores con hooks
 */
function ErrorDisplay({
  error,
  errorInfo,
  onRetry,
  onReportError,
}: {
  error?: Error;
  errorInfo?: ErrorInfo;
  onRetry: () => void;
  onReportError: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showToast, setShowToast] = React.useState(false);

  const handleReportError = () => {
    onReportError();
    setShowToast(true);
  };

  const handleGoHome = () => {
    router.push('/home');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Algo salió mal</h3>
              <p className="text-sm text-gray-500">
                Ha ocurrido un error inesperado en la aplicación.
              </p>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Detalles del error (solo en desarrollo):
              </h4>
              <pre className="text-xs text-red-700 whitespace-pre-wrap">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          )}

          <div className="flex space-x-3">
            <Button variant="primary" onClick={onRetry} className="flex-1">
              Intentar de nuevo
            </Button>

            <Button variant="secondary" onClick={handleReportError} className="flex-1">
              Reportar error
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button variant="ghost" onClick={handleGoHome} size="sm">
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      <Toast
        title="Error reportado"
        description="Gracias por tu feedback."
        variant="success"
        open={showToast}
        onOpenChange={setShowToast}
      />
    </>
  );
}

/**
 * Error Boundary para capturar errores de renderizado de React
 * Loggea automáticamente los errores con contexto completo
 * REGLA CURSOR: No modificar serialización de errores, mantener logging estructurado con contexto máximo
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar el state para mostrar la UI de error
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Loggear el error con contexto completo
    // Usar pathname si está disponible, sino window.location.href como fallback
    const url = typeof window !== 'undefined' ? window.location.href : undefined;

    logger.error('Error de renderizado capturado por ErrorBoundary', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      url,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
    });

    // Llamar callback personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Actualizar state con errorInfo
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleReportError = () => {
    if (this.state.error) {
      // En un entorno real, aquí se enviaría el error a un servicio de reporte
      logger.info('Usuario reportó error manualmente', {
        error: this.state.error.message,
        stack: this.state.error.stack,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // UI de error personalizada
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto usando componente funcional con hooks
      return (
        <ErrorDisplay
          {...(this.state.error && { error: this.state.error })}
          {...(this.state.errorInfo && { errorInfo: this.state.errorInfo })}
          onRetry={this.handleRetry}
          onReportError={this.handleReportError}
        />
      );
    }

    return this.props.children;
  }
}
