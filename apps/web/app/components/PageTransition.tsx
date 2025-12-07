'use client';

/**
 * PageTransition - Wrapper component for consistent page entrance animations
 * 
 * AI_DECISION: Centralized page transition wrapper for cohesive UX
 * Justificación: Provides uniform page entrance animations across the entire app
 * Impacto: Smooth, professional feel when navigating between pages
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@cactus/ui';

export interface PageTransitionProps {
  /** Content to animate */
  children: React.ReactNode;
  /** Animation variant */
  variant?: 'fade-up' | 'fade-in' | 'scale-in' | 'reveal-up' | 'none';
  /** Animation duration in ms */
  duration?: number;
  /** Delay before animation starts in ms */
  delay?: number;
  /** Additional className */
  className?: string;
  /** Whether animation is enabled */
  enabled?: boolean;
}

const variantClasses = {
  'fade-up': {
    initial: 'opacity-0 translate-y-4',
    animate: 'opacity-100 translate-y-0',
  },
  'fade-in': {
    initial: 'opacity-0',
    animate: 'opacity-100',
  },
  'scale-in': {
    initial: 'opacity-0 scale-[0.98]',
    animate: 'opacity-100 scale-100',
  },
  'reveal-up': {
    initial: 'opacity-0 translate-y-6',
    animate: 'opacity-100 translate-y-0',
  },
  'none': {
    initial: '',
    animate: '',
  },
};

/**
 * PageTransition wraps page content with smooth entrance animations.
 * 
 * @example
 * ```tsx
 * // In a page.tsx file
 * export default function ContactsPage() {
 *   return (
 *     <PageTransition variant="fade-up">
 *       <div className="p-4">
 *         Page content here
 *       </div>
 *     </PageTransition>
 *   );
 * }
 * ```
 */
export function PageTransition({
  children,
  variant = 'fade-up',
  duration = 500,
  delay = 0,
  className,
  enabled = true,
}: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setMounted(true);
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setMounted(true), delay + 10);
    return () => clearTimeout(timer);
  }, [enabled, delay]);

  const config = variantClasses[variant];

  if (variant === 'none' || !enabled) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        'transition-all ease-out',
        mounted ? config.animate : config.initial,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * PageHeader - Animated header section for pages
 */
export interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function PageHeader({ children, className, delay = 0 }: PageHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay + 10);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * PageContent - Animated main content section with slight delay
 */
export interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function PageContent({ children, className, delay = 100 }: PageContentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay + 10);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Staggered section wrapper for sequential reveals
 */
export interface StaggeredSectionProps {
  children: React.ReactNode;
  index: number;
  baseDelay?: number;
  className?: string;
}

export function StaggeredSection({ 
  children, 
  index, 
  baseDelay = 75, 
  className 
}: StaggeredSectionProps) {
  const [mounted, setMounted] = useState(false);
  const delay = index * baseDelay;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay + 10);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export default PageTransition;
