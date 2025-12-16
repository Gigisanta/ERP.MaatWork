'use client';

/**
 * SkeletonLoader - Consistent skeleton loading components
 *
 * AI_DECISION: Centralized skeleton components for consistent loading states
 * Justificación: Eliminates duplicate skeleton definitions across loading.tsx files
 * Impacto: Unified loading experience with consistent skeleton-wave animation
 *
 * @example
 * ```tsx
 * import { Skeleton, SkeletonText, SkeletonCard } from './SkeletonLoader';
 *
 * <Skeleton className="h-8 w-48" />
 * <SkeletonText lines={3} />
 * <SkeletonCard />
 * ```
 */

import React from 'react';
// AI_DECISION: Create local cn function to avoid webpack module resolution issues with @cactus/ui
// Justificación: Webpack sometimes fails to resolve @cactus/ui exports in certain contexts, causing "Cannot read properties of undefined (reading 'call')" error
// Impacto: Fixes webpack module resolution error, ensures SkeletonLoader loads correctly
// Note: clsx is available as transitive dependency through @cactus/ui
import clsx from 'clsx';

function cn(...inputs: Parameters<typeof clsx>) {
  return clsx(inputs);
}

// =============================================================================
// Types
// =============================================================================

export interface SkeletonProps {
  className?: string;
  /** Animation type */
  animation?: 'wave' | 'pulse' | 'none';
  /** Stagger delay in ms (for sequential loading effect) */
  delay?: number;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export interface SkeletonTextProps {
  /** Number of lines to show */
  lines?: number;
  /** Last line width percentage */
  lastLineWidth?: string;
  /** Gap between lines */
  gap?: 'sm' | 'md' | 'lg';
  /** Animation type */
  animation?: 'wave' | 'pulse' | 'none';
}

export interface SkeletonCardProps {
  /** Whether to show header skeleton */
  showHeader?: boolean;
  /** Whether to show footer/actions skeleton */
  showFooter?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Delay for staggered animation */
  delay?: number;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

const gapClasses = {
  sm: 'space-y-1',
  md: 'space-y-2',
  lg: 'space-y-3',
};

// =============================================================================
// Base Skeleton Component
// =============================================================================

export function Skeleton({
  className,
  animation = 'wave',
  delay = 0,
  rounded = 'md',
}: SkeletonProps) {
  const animationClass =
    animation === 'wave' ? 'skeleton-wave' : animation === 'pulse' ? 'animate-pulse' : '';

  return (
    <div
      className={cn('bg-surface-hover', roundedClasses[rounded], animationClass, className)}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

// =============================================================================
// Skeleton Text (multiple lines)
// =============================================================================

export function SkeletonText({
  lines = 3,
  lastLineWidth = 'w-3/4',
  gap = 'md',
  animation = 'wave',
}: SkeletonTextProps) {
  return (
    <div className={cn(gapClasses[gap])}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? lastLineWidth : 'w-full')}
          animation={animation}
          delay={i * 50}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Skeleton Avatar
// =============================================================================

export function SkeletonAvatar({
  size = 'md',
  animation = 'wave',
}: {
  size?: 'sm' | 'md' | 'lg';
  animation?: 'wave' | 'pulse' | 'none';
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton className={sizeClasses[size]} rounded="full" animation={animation} />;
}

// =============================================================================
// Skeleton Card
// =============================================================================

export function SkeletonCard({
  showHeader = true,
  showFooter = false,
  contentLines = 3,
  delay = 0,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-4 space-y-4',
        'animate-fade-in',
        className
      )}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-1/3" delay={delay} />
          <Skeleton className="h-6 w-20" delay={delay + 50} />
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-4', i === contentLines - 1 ? 'w-2/3' : 'w-full')}
            delay={delay + 100 + i * 50}
          />
        ))}
      </div>

      {showFooter && (
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-9 w-24" rounded="lg" delay={delay + 200} />
          <Skeleton className="h-9 w-24" rounded="lg" delay={delay + 250} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Skeleton Table Row
// =============================================================================

export function SkeletonTableRow({ columns = 5, delay = 0 }: { columns?: number; delay?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4 flex-1', i === 0 ? 'max-w-[200px]' : 'max-w-[150px]')}
          delay={delay + i * 30}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Skeleton Table
// =============================================================================

export function SkeletonTable({
  rows = 5,
  columns = 5,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex items-center gap-4 py-3 border-b-2 border-border mb-1">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-5 flex-1 max-w-[150px]" delay={i * 30} />
          ))}
        </div>
      )}
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} delay={(i + 1) * 75} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Skeleton Grid
// =============================================================================

export function SkeletonGrid({
  items = 6,
  columns = 3,
  showCardHeader = true,
  contentLines = 3,
}: {
  items?: number;
  columns?: 2 | 3 | 4;
  showCardHeader?: boolean;
  contentLines?: number;
}) {
  const gridClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridClasses[columns])}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard
          key={i}
          showHeader={showCardHeader}
          contentLines={contentLines}
          delay={i * 75}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Skeleton Page Header
// =============================================================================

export function SkeletonPageHeader({
  showBreadcrumb = false,
  showActions = true,
}: {
  showBreadcrumb?: boolean;
  showActions?: boolean;
}) {
  return (
    <div className="space-y-3 mb-6 animate-fade-in">
      {showBreadcrumb && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" delay={50} />
        {showActions && (
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" delay={100} />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Export all
// =============================================================================

export default Skeleton;
