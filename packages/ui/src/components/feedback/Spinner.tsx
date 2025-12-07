import React from 'react';
import { cn } from '../../utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Color variant for the spinner */
  variant?: 'default' | 'secondary' | 'accent';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

const variantClasses = {
  default: 'text-text-secondary',
  secondary: 'text-secondary',
  accent: 'text-accent',
};

/**
 * Spinner component for loading states.
 * 
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="lg" variant="secondary" />
 * <Spinner variant="accent" />
 * ```
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', variant = 'default', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

// Loading overlay component
export interface LoadingOverlayProps {
  children: React.ReactNode;
  loading: boolean;
  text?: string;
  className?: string;
}

/**
 * Loading overlay component that covers content while loading.
 * 
 * @example
 * ```tsx
 * <LoadingOverlay loading={isLoading} text="Saving changes...">
 *   <Form>...</Form>
 * </LoadingOverlay>
 * ```
 */
export const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ children, loading, text = 'Loading...', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative', className)}
        {...props}
      >
        {children}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center space-y-3">
              <Spinner size="lg" variant="secondary" />
              {text && (
                <p className="text-sm text-text-secondary font-body">{text}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';
