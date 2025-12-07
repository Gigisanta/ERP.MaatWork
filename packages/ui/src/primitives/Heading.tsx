import React from 'react';
import { cn } from '../utils/cn';

export interface HeadingProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children?: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Color variant for the heading */
  color?: 'default' | 'secondary' | 'accent' | 'muted';
  // Allow all standard HTML attributes
  [key: string]: unknown;
}

/**
 * Heading component using Poppins font (display font).
 * Used for all headings and titles in the application.
 * 
 * @example
 * ```tsx
 * <Heading level={1}>Page Title</Heading>
 * <Heading level={2} color="secondary">Section Title</Heading>
 * ```
 */
export function Heading({ 
  as, 
  className, 
  children, 
  level = 1, 
  color = 'default',
  ...props 
}: HeadingProps) {
  const Component = as || (`h${level}` as keyof React.JSX.IntrinsicElements);

  return (
    <Component
      className={cn(
        // Base styles - Poppins font family
        'font-display tracking-tight',
        // Size and weight based on level
        {
          'text-4xl font-bold leading-tight md:text-5xl': level === 1,
          'text-3xl font-bold leading-tight md:text-4xl': level === 2,
          'text-2xl font-semibold leading-snug md:text-3xl': level === 3,
          'text-xl font-semibold leading-snug md:text-2xl': level === 4,
          'text-lg font-medium leading-normal md:text-xl': level === 5,
          'text-base font-medium leading-normal md:text-lg': level === 6,
        },
        // Color variants
        {
          'text-text': color === 'default',
          'text-secondary': color === 'secondary',
          'text-accent': color === 'accent',
          'text-text-muted': color === 'muted',
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
