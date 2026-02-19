'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '../../lib/logger';
// AI_DECISION: No importar componentes de @maatwork/ui aquí
// Justificación: Evita dependencia circular en el RootLayout (layout.tsx)
// Impacto: Previene errores de 'undefined.call' durante la hidratación inicial
// import { Toast, Button } from '@maatwork/ui';

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
 * Componente funcional interno para mostrar errores con CSS plano
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
  const [showToast, setShowToast] = React.useState(false);

  const handleReportError = () => {
    onReportError();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleGoHome = () => {
    router.push('/home');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-8 border border-gray-200">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <svg
                className="h-8 w-8 text-red-600"
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h3>
            <p className="text-gray-600">
              Ha ocurrido un error inesperado. Hemos sido notificados y estamos trabajando en ello.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6 p-4 bg-gray-900 rounded-lg overflow-hidden">
              <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                Debug Info:
              </h4>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={onRetry}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-md active:scale-95"
            >
              Intentar de nuevo
            </button>

            <button
              onClick={handleReportError}
              className="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors active:scale-95"
            >
              Reportar incidente
            </button>

            <button
              onClick={handleGoHome}
              className="w-full py-2 px-4 bg-transparent text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>

      {/* Basic Toast replacement */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4 flex items-center gap-3 border border-white/10">
          <span className="text-green-400">✓</span>
          <span className="text-sm font-medium">Error reportado con éxito</span>
        </div>
      )}
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

    logger.error({
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
    }, 'Error de renderizado capturado por ErrorBoundary');

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
      logger.info({
        error: this.state.error.message,
        stack: this.state.error.stack,
      }, 'Usuario reportó error manualmente');
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
