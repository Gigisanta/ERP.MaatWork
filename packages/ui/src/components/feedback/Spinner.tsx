import React from 'react';
import { cn } from '../../utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          'text-text-secondary',
          sizeClasses[size],
          className
        )}
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
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <Spinner size="lg" />
              {text && (
                <p className="text-sm text-text-secondary">{text}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';





