import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual style variant */
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/**
 * Badge component with brand styling.
 * 
 * @example
 * ```tsx
 * <Badge variant="primary">New</Badge>
 * <Badge variant="secondary">Beta</Badge>
 * <Badge variant="accent">Growth</Badge>
 * <Badge variant="success">Active</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', children, className, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-surface-hover text-text',
      primary: 'bg-primary-subtle text-primary',
      secondary: 'bg-secondary-subtle text-secondary',
      accent: 'bg-accent-subtle text-accent-hover',
      success: 'bg-success-subtle text-success',
      warning: 'bg-warning-subtle text-warning',
      error: 'bg-error-subtle text-error',
      outline: 'bg-transparent border border-border text-text',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-medium font-body',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
