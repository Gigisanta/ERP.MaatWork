'use client';

/**
 * PageContainer - Consistent layout wrapper for all pages
 *
 * AI_DECISION: Centralized container component for UI consistency
 * Justificación: Ensures all pages have consistent max-width, padding, and animations
 * Impacto: Unified look and feel across the entire application
 *
 * @example
 * ```tsx
 * <PageContainer>
 *   <PageContainer.Header>
 *     <Heading level={1}>Page Title</Heading>
 *   </PageContainer.Header>
 *   <PageContainer.Content>
 *     {children}
 *   </PageContainer.Content>
 * </PageContainer>
 * ```
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@maatwork/ui';

// =============================================================================
// Types
// =============================================================================

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface PageContainerProps {
  children: React.ReactNode;
  /** Maximum width of the container */
  size?: ContainerSize;
  /** Additional className */
  className?: string;
  /** Enable page entrance animation */
  animated?: boolean;
  /** Custom padding (overrides default) */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
  /** Enable breadcrumb style back link */
  backLink?: {
    href: string;
    label: string;
  };
  /** Right side actions */
  actions?: React.ReactNode;
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  /** Animation delay index for staggered effect */
  delay?: number;
}

// =============================================================================
// Constants
// =============================================================================

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1400px]',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'px-3 py-2 sm:px-4 sm:py-3',
  md: 'px-4 py-4 sm:px-6 lg:px-8',
  lg: 'px-4 py-6 sm:px-6 lg:px-8',
};

// =============================================================================
// Main Component
// =============================================================================

export function PageContainer({
  children,
  size = 'lg',
  className,
  animated = true,
  padding = 'md',
}: PageContainerProps) {
  const [mounted, setMounted] = useState(!animated);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, [animated]);

  return (
    <main
      className={cn(
        'mx-auto w-full',
        sizeClasses[size],
        paddingClasses[padding],
        animated && 'transition-all duration-500 ease-out',
        animated && (mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'),
        className
      )}
    >
      {children}
    </main>
  );
}

// =============================================================================
// Header Sub-component
// =============================================================================

function PageHeader({ children, className, backLink, actions }: PageHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <header
      className={cn(
        'mb-6 transition-all duration-500 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className
      )}
      style={{ transitionDelay: '50ms' }}
    >
      {backLink && (
        <div className="flex items-center gap-4 mb-3">
          <a href={backLink.href} className="text-sm text-info hover:underline transition-colors">
            ← {backLink.label}
          </a>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">{children}</div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

// =============================================================================
// Content Sub-component
// =============================================================================

function PageContent({ children, className, delay = 100 }: PageContentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Section Sub-component (for staggered sections)
// =============================================================================

function PageSection({
  children,
  className,
  index = 0,
  baseDelay = 75,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
  baseDelay?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const delay = 100 + index * baseDelay;

  return (
    <section
      className={cn(
        'transition-all duration-500 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </section>
  );
}

// =============================================================================
// Attach sub-components
// =============================================================================

PageContainer.Header = PageHeader;
PageContainer.Content = PageContent;
PageContainer.Section = PageSection;

export { PageHeader, PageContent, PageSection };
