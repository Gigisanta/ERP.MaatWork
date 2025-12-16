'use client';

/**
 * PageTransition - Wrapper component for consistent page entrance animations
 *
 * AI_DECISION: Simplified to use CSS Keyframe Animations
 * Justificación: Better performance and cleaner code than JS-based transitions.
 * Impacto: Uses the new physics-based springs defined in @cactus/ui
 */

import React from 'react';
import { cn } from '@cactus/ui';

export interface PageTransitionProps {
  /** Content to animate */
  children: React.ReactNode;
  /** Animation variant */
  variant?: 'fade-up' | 'fade-in' | 'scale-in' | 'none';
  /** Additional className */
  className?: string;
}

const variantClasses = {
  'fade-up': 'animate-enter', // Uses springSlideUp
  'fade-in': 'animate-fade-in',
  'scale-in': 'animate-pop',
  none: '',
};

export function PageTransition({ children, variant = 'fade-up', className }: PageTransitionProps) {
  if (variant === 'none') {
    return <>{children}</>;
  }

  return <div className={cn(variantClasses[variant], 'w-full', className)}>{children}</div>;
}

/**
 * PageHeader - Animated header section for pages
 */
export interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function PageHeader({ children, className }: PageHeaderProps) {
  return <div className={cn('animate-fade-in-down w-full', className)}>{children}</div>;
}

/**
 * PageContent - Animated main content section
 */
export interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn('animate-fade-in-up delay-100 fill-mode-forwards w-full', className)}>
      {children}
    </div>
  );
}

/**
 * StaggeredSection - For sequential reveals
 */
export interface StaggeredSectionProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

export function StaggeredSection({ children, index, className }: StaggeredSectionProps) {
  return (
    <div
      className={cn('animate-fade-in-up fill-mode-forwards opacity-0', className)}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {children}
    </div>
  );
}

export default PageTransition;
