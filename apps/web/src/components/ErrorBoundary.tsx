import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { cn } from '../lib/utils';
// Removed LayoutConfig import - using semantic Tailwind classes

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-cactus-200 dark:border-neutral-700 p-8 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-cactus">
              ¡Oops! Algo salió mal
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-sm">
              Se produjo un error inesperado. No te preocupes, nuestro equipo ha sido notificado.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Detalles del Error (Desarrollo):</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-neutral-500 dark:text-neutral-500 cursor-pointer">Stack Trace</summary>
                    <pre className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200",
                  "bg-cactus-600 hover:bg-cactus-700 text-white font-medium shadow-md hover:shadow-lg hover:scale-[1.02]"
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Intentar de nuevo
              </button>
              
              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200",
                  "bg-white dark:bg-neutral-800 border border-cactus-200 dark:border-neutral-700 hover:bg-cactus-50 dark:hover:bg-neutral-700",
                  "text-neutral-900 dark:text-neutral-100 font-medium hover:scale-[1.02]"
                )}
              >
                <Home className="w-4 h-4" />
                Ir al Dashboard
              </button>
            </div>

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Si el problema persiste, contacta al soporte técnico
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: string) => {
    console.error('Error handled by useErrorHandler:', error);
    
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        info: errorInfo
      });
    }
  };

  return { handleError };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};