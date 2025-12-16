import React from 'react';
import { cn } from '../../utils/cn.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual style variant */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'success'
    | 'warning'
    | 'error'
    | 'joy'
    | 'info'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  /** Enable pop animation on mount */
  animated?: boolean;
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
  ({ variant = 'default', size = 'md', animated = false, children, className, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-surface-hover text-text',
      primary: 'bg-primary-subtle text-primary border border-primary/10',
      secondary: 'bg-secondary-subtle text-secondary border border-secondary/10',
      accent: 'bg-accent-subtle text-accent-hover border border-accent/10',
      success: 'bg-success-subtle text-success border border-success/10',
      warning: 'bg-warning-subtle text-warning border border-warning/10',
      error: 'bg-error-subtle text-error border border-error/10',
      joy: 'bg-joy-subtle text-joy-hover border border-joy/10',
      info: 'bg-info-subtle text-info-hover border border-info/10',
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
          'inline-flex items-center rounded-full font-medium font-body transition-colors',
          variantClasses[variant],
          sizeClasses[size],
          animated && 'animate-pop',
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
