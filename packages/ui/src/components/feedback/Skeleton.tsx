import React from 'react';
import { cn } from '../../utils/cn.js';

export type SkeletonVariant = 'text' | 'circle' | 'rectangle' | 'button' | 'avatar' | 'card-header';
export type SkeletonAnimation = 'pulse' | 'wave' | 'none';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant determines the shape of the skeleton */
  variant?: SkeletonVariant;
  /** Width of the skeleton (CSS value) */
  width?: string | number;
  /** Height of the skeleton (CSS value) */
  height?: string | number;
  /** For text variant, number of lines to display */
  lines?: number;
  /** Whether to animate the skeleton (deprecated - use animation prop instead) */
  animate?: boolean;
  /** Animation type for the skeleton */
  animation?: SkeletonAnimation;
}

/**
 * Skeleton component for loading placeholders.
 * Provides visual feedback while content is loading.
 *
 * @example
 * ```tsx
 * // Text skeleton (default)
 * <Skeleton width="200px" />
 *
 * // Multiple text lines
 * <Skeleton variant="text" lines={3} />
 *
 * // Circle (avatars, icons)
 * <Skeleton variant="circle" width={40} height={40} />
 *
 * // Rectangle (cards, images)
 * <Skeleton variant="rectangle" width="100%" height={200} />
 * ```
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      lines = 1,
      animate = true,
      animation = 'wave',
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Animation classes based on animation prop or legacy animate prop
    const animationClass = !animate
      ? ''
      : animation === 'pulse'
        ? 'animate-pulse'
        : animation === 'wave'
          ? 'skeleton-wave'
          : '';

    const baseClasses = cn('bg-surface dark:bg-gray-700 rounded', animationClass, className);

    const getStyle = (
      customWidth?: string | number,
      customHeight?: string | number
    ): React.CSSProperties => ({
      width: typeof customWidth === 'number' ? `${customWidth}px` : customWidth,
      height: typeof customHeight === 'number' ? `${customHeight}px` : customHeight,
      ...style,
    });

    // Circle variant
    if (variant === 'circle') {
      const size = width || height || 40;
      return (
        <div
          ref={ref}
          className={cn(baseClasses, 'rounded-full')}
          style={getStyle(size, size)}
          aria-hidden="true"
          {...props}
        />
      );
    }

    // Rectangle variant
    if (variant === 'rectangle') {
      return (
        <div
          ref={ref}
          className={cn(baseClasses, 'rounded-md')}
          style={getStyle(width || '100%', height || 100)}
          aria-hidden="true"
          {...props}
        />
      );
    }

    // Text variant (default)
    if (lines > 1) {
      return (
        <div ref={ref} className="space-y-2" aria-hidden="true" {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(baseClasses, 'rounded h-4')}
              style={getStyle(
                // Last line is shorter for natural text appearance
                index === lines - 1 ? '75%' : width || '100%',
                height || 16
              )}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(baseClasses, 'rounded h-4')}
        style={getStyle(width || '100%', height || 16)}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonGroup component for composing multiple skeleton elements.
 *
 * @example
 * ```tsx
 * <SkeletonGroup>
 *   <Skeleton variant="circle" width={48} height={48} />
 *   <div className="flex-1">
 *     <Skeleton width="60%" />
 *     <Skeleton width="40%" className="mt-2" />
 *   </div>
 * </SkeletonGroup>
 * ```
 */
export interface SkeletonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Direction of the skeleton group */
  direction?: 'row' | 'column';
  /** Gap between skeleton elements */
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

export const SkeletonGroup = React.forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ direction = 'row', gap = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          direction === 'column' ? 'flex-col' : 'flex-row items-center',
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SkeletonGroup.displayName = 'SkeletonGroup';

/**
 * SkeletonCard - Pre-built skeleton for card layouts
 */
export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show avatar */
  showAvatar?: boolean;
  /** Number of text lines */
  lines?: number;
}

export const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ showAvatar = true, lines = 3, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-4 border border-gray-200 dark:border-gray-700 rounded-lg', className)}
        {...props}
      >
        <SkeletonGroup gap="md">
          {showAvatar && <Skeleton variant="circle" width={48} height={48} />}
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={20} />
            <Skeleton variant="text" lines={lines - 1} />
          </div>
        </SkeletonGroup>
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

/**
 * SkeletonTable - Pre-built skeleton for table layouts
 */
export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
}

export const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {/* Header */}
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} height={20} width={`${100 / columns}%`} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                height={16}
                width={`${100 / columns}%`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

SkeletonTable.displayName = 'SkeletonTable';
