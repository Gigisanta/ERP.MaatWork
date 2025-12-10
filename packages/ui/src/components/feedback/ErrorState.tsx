import React from 'react';
import { cn } from '../../utils/cn.js';
import Icon, { type IconName } from '../Icon.js';
import Button from '../nav/Button.js';

export type ErrorStateVariant = 'error' | 'warning' | 'info' | 'network';
export type ErrorStateSize = 'sm' | 'md' | 'lg';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Error title */
  title: string;
  /** Error description/message */
  description?: string;
  /** Suggested action text */
  actionText?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Retry button text */
  retryText?: string;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Secondary action callback (e.g., go back, contact support) */
  onSecondaryAction?: () => void;
  /** Secondary action button text */
  secondaryActionText?: string;
  /** Custom icon name */
  icon?: IconName;
  /** Error variant */
  variant?: ErrorStateVariant;
  /** Size variant */
  size?: ErrorStateSize;
  /** Request ID for debugging (only shown in development) */
  requestId?: string;
  /** Whether to show the request ID */
  showRequestId?: boolean;
  /** Custom content to render below the actions */
  children?: React.ReactNode;
}

const variantConfig: Record<
  ErrorStateVariant,
  { icon: IconName; iconColor: string; bgColor: string }
> = {
  error: {
    icon: 'x-circle',
    iconColor: 'text-error',
    bgColor: 'bg-error-subtle',
  },
  warning: {
    icon: 'alert-triangle',
    iconColor: 'text-warning',
    bgColor: 'bg-warning-subtle',
  },
  info: {
    icon: 'info',
    iconColor: 'text-info',
    bgColor: 'bg-info-subtle',
  },
  network: {
    icon: 'wifi-off',
    iconColor: 'text-error',
    bgColor: 'bg-error-subtle',
  },
};

const sizeConfig: Record<ErrorStateSize, { iconSize: number; padding: string; gap: string }> = {
  sm: {
    iconSize: 24,
    padding: 'p-4',
    gap: 'gap-3',
  },
  md: {
    iconSize: 32,
    padding: 'p-6',
    gap: 'gap-4',
  },
  lg: {
    iconSize: 48,
    padding: 'p-8',
    gap: 'gap-5',
  },
};

/**
 * ErrorState component for displaying error states with retry functionality.
 *
 * AI_DECISION: Componente centralizado para estados de error
 * Justificación: Proporciona UX consistente para todos los errores en la app
 * Impacto: Mejor experiencia de usuario, código más mantenible
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorState
 *   title="Error al cargar datos"
 *   description="No se pudieron cargar los contactos."
 *   onRetry={() => refetch()}
 * />
 *
 * // With action text and secondary action
 * <ErrorState
 *   title="Sesión expirada"
 *   description="Tu sesión ha expirado."
 *   actionText="Inicia sesión nuevamente para continuar."
 *   onSecondaryAction={() => router.push('/login')}
 *   secondaryActionText="Iniciar sesión"
 *   variant="warning"
 * />
 *
 * // Network error with retry
 * <ErrorState
 *   title="Error de conexión"
 *   description="No se pudo conectar al servidor."
 *   variant="network"
 *   onRetry={handleRetry}
 *   isRetrying={isLoading}
 * />
 * ```
 */
export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title,
      description,
      actionText,
      onRetry,
      retryText = 'Reintentar',
      isRetrying = false,
      onSecondaryAction,
      secondaryActionText,
      icon,
      variant = 'error',
      size = 'md',
      requestId,
      showRequestId = process.env.NODE_ENV === 'development',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant];
    const sizeStyles = sizeConfig[size];
    const iconName = icon || config.icon;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border',
          config.bgColor,
          'border-border',
          sizeStyles.padding,
          className
        )}
        role="alert"
        aria-live="polite"
        {...props}
      >
        <div className={cn('flex flex-col items-center text-center', sizeStyles.gap)}>
          {/* Icon */}
          <div
            className={cn(
              'rounded-full p-3',
              variant === 'error' && 'bg-error/10',
              variant === 'warning' && 'bg-warning/10',
              variant === 'info' && 'bg-info/10',
              variant === 'network' && 'bg-error/10'
            )}
          >
            <Icon name={iconName} size={sizeStyles.iconSize} className={config.iconColor} />
          </div>

          {/* Text content */}
          <div className="space-y-1">
            <h3
              className={cn(
                'font-semibold text-text',
                size === 'sm' && 'text-sm',
                size === 'md' && 'text-base',
                size === 'lg' && 'text-lg'
              )}
            >
              {title}
            </h3>

            {description && (
              <p
                className={cn(
                  'text-text-secondary',
                  size === 'sm' && 'text-xs',
                  size === 'md' && 'text-sm',
                  size === 'lg' && 'text-base'
                )}
              >
                {description}
              </p>
            )}

            {actionText && (
              <p
                className={cn(
                  'text-text-muted italic',
                  size === 'sm' && 'text-xs',
                  size === 'md' && 'text-xs',
                  size === 'lg' && 'text-sm'
                )}
              >
                {actionText}
              </p>
            )}
          </div>

          {/* Actions */}
          {(onRetry || onSecondaryAction) && (
            <div className="flex flex-wrap gap-2 justify-center">
              {onRetry && (
                <Button
                  variant="primary"
                  size={size === 'lg' ? 'md' : 'sm'}
                  onClick={onRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <Icon name="loader" size={14} className="mr-1 animate-spin" />
                      Reintentando...
                    </>
                  ) : (
                    <>
                      <Icon name="refresh-cw" size={14} className="mr-1" />
                      {retryText}
                    </>
                  )}
                </Button>
              )}

              {onSecondaryAction && secondaryActionText && (
                <Button
                  variant="secondary"
                  size={size === 'lg' ? 'md' : 'sm'}
                  onClick={onSecondaryAction}
                  disabled={isRetrying}
                >
                  {secondaryActionText}
                </Button>
              )}
            </div>
          )}

          {/* Request ID for debugging */}
          {showRequestId && requestId && (
            <p className="text-xs text-text-muted font-mono">Request ID: {requestId}</p>
          )}

          {/* Custom content */}
          {children}
        </div>
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';

/**
 * Inline error state for smaller spaces (e.g., within cards or forms)
 */
export interface InlineErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const InlineErrorState = React.forwardRef<HTMLDivElement, InlineErrorStateProps>(
  ({ message, onRetry, isRetrying = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-3 p-3 rounded-md',
          'bg-error-subtle border border-error/20',
          className
        )}
        role="alert"
        {...props}
      >
        <div className="flex items-center gap-2">
          <Icon name="alert-circle" size={16} className="text-error flex-shrink-0" />
          <span className="text-sm text-text-secondary">{message}</span>
        </div>

        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-shrink-0"
          >
            {isRetrying ? (
              <Icon name="loader" size={14} className="animate-spin" />
            ) : (
              <Icon name="refresh-cw" size={14} />
            )}
          </Button>
        )}
      </div>
    );
  }
);

InlineErrorState.displayName = 'InlineErrorState';

export default ErrorState;
