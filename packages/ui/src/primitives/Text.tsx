import React from 'react';
import { cn } from '../utils/cn.js';

export interface TextProps {
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?:
    | 'default'
    | 'secondary'
    | 'muted'
    | 'accent'
    | 'success'
    | 'warning'
    | 'error'
    | 'inverse';
  /** Whether to use display font (Poppins) instead of body font (Open Sans) */
  display?: boolean;
  // Allow all standard HTML attributes
  [key: string]: unknown;
}

/**
 * Text component using Open Sans font (body font) by default.
 * Can optionally use Poppins (display font) for emphasis.
 *
 * @example
 * ```tsx
 * <Text>Regular body text</Text>
 * <Text color="secondary" size="sm">Secondary small text</Text>
 * <Text display weight="semibold">Display text with Poppins</Text>
 * ```
 */
export function Text({
  as: Component = 'p',
  className,
  children,
  size = 'base',
  weight = 'normal',
  color = 'default',
  display = false,
  ...props
}: TextProps) {
  return (
    <Component
      className={cn(
        // Font family
        display ? 'font-display' : 'font-body',
        // Size classes
        {
          'text-xs leading-4': size === 'xs',
          'text-sm leading-5': size === 'sm',
          'text-base leading-6': size === 'base',
          'text-lg leading-7': size === 'lg',
          'text-xl leading-8': size === 'xl',
        },
        // Weight classes
        {
          'font-normal': weight === 'normal',
          'font-medium': weight === 'medium',
          'font-semibold': weight === 'semibold',
          'font-bold': weight === 'bold',
        },
        // Color classes
        {
          'text-text': color === 'default',
          'text-text-secondary': color === 'secondary',
          'text-text-muted': color === 'muted',
          'text-accent': color === 'accent',
          'text-success': color === 'success',
          'text-warning': color === 'warning',
          'text-error': color === 'error',
          'text-text-inverse': color === 'inverse',
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
