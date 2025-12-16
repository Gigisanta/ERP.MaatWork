import React from 'react';
import { cn } from '../../utils/cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual style variant */
  variant?: 'outlined' | 'elevated' | 'interactive' | 'highlight' | 'animated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Enable hover animations (lift + glow effect) */
  animated?: boolean;
  children: React.ReactNode;
}

/**
 * Card component with brand styling.
 *
 * @example
 * ```tsx
 * <Card variant="outlined">
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *     <CardDescription>Card description text</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content here</CardContent>
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'outlined', padding = 'md', animated = false, children, className, ...props },
    ref
  ) => {
    const variantClasses = {
      outlined: 'border border-border bg-background',
      elevated: 'shadow-md bg-background border-0',
      interactive:
        'border border-border bg-background hover:shadow-lg hover:border-secondary/30 transition-all-smooth cursor-pointer hover-lift',
      highlight: 'border-l-4 border-l-secondary border border-border bg-background',
      // New animated variant with enhanced hover effects
      animated:
        'border border-border bg-background hover:shadow-lg hover:border-primary/30 hover-lift transition-all-smooth cursor-pointer',
      glass:
        'border border-white/20 bg-white/70 backdrop-blur-md shadow-sm dark:bg-black/40 dark:border-white/10',
    };

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    // Animated prop adds hover-lift effect to any variant
    const animatedClasses = animated
      ? 'hover:shadow-lg hover-lift hover:border-primary/30 transition-all duration-300'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg font-body',
          variantClasses[variant],
          paddingClasses[padding],
          animatedClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mb-4', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold text-text font-display tracking-tight', className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-text-secondary font-body mt-1', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('font-body', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mt-4 pt-4 border-t border-border', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
