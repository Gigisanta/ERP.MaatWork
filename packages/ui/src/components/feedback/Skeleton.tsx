import React from 'react';
import { cn } from '../../utils/cn.js';

export type SkeletonVariant = 'text' | 'circle' | 'rectangle' | 'button' | 'avatar' | 'card-header';
type SkeletonAnimation = 'pulse' | 'wave' | 'none';

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
  /** Stagger delay in ms (for sequential loading effect) */
  delay?: number;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Skeleton component for loading placeholders.
 * Provides visual feedback while content is loading.
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
      delay = 0,
      rounded,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Animation classes
    const animationClass = !animate
      ? ''
      : animation === 'pulse'
        ? 'animate-pulse'
        : animation === 'wave'
          ? 'skeleton-wave'
          : '';

    const baseClasses = cn(
      'bg-surface-hover dark:bg-gray-700',
      rounded ? roundedClasses[rounded] : variant === 'circle' ? 'rounded-full' : 'rounded',
      animationClass,
      className
    );

    const getStyle = (
      customWidth?: string | number,
      customHeight?: string | number
    ): React.CSSProperties => ({
      width: typeof customWidth === 'number' ? `${customWidth}px` : customWidth,
      height: typeof customHeight === 'number' ? `${customHeight}px` : customHeight,
      ...(delay > 0 ? { animationDelay: `${delay}ms` } : {}),
      ...style,
    });

    // Multiple text lines
    if (variant === 'text' && lines > 1) {
      return (
        <div ref={ref} className="space-y-2" aria-hidden="true" {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(baseClasses, 'h-4')}
              style={getStyle(index === lines - 1 ? '75%' : width || '100%', height || 16)}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variant === 'circle' ? '' : 'h-4')}
        style={getStyle(
          width || (variant === 'circle' ? 40 : '100%'),
          height || (variant === 'circle' ? 40 : 16)
        )}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// =============================================================================
// Specialized Skeleton Components
// =============================================================================

export interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  gap?: 'sm' | 'md' | 'lg';
  animation?: SkeletonAnimation;
}

const gapClasses = {
  sm: 'space-y-1',
  md: 'space-y-2',
  lg: 'space-y-3',
};

export function SkeletonText({
  lines = 3,
  lastLineWidth = '75%',
  gap = 'md',
  animation = 'wave',
}: SkeletonTextProps) {
  return (
    <div className={cn(gapClasses[gap])}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? '' : 'w-full')}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          animation={animation}
          delay={i * 50}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = 'md',
  animation = 'wave',
}: {
  size?: 'sm' | 'md' | 'lg';
  animation?: SkeletonAnimation;
}) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  return (
    <Skeleton variant="circle" width={sizeMap[size]} height={sizeMap[size]} animation={animation} />
  );
}

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showHeader?: boolean;
  showFooter?: boolean;
  showAvatar?: boolean;
  contentLines?: number;
  delay?: number;
  lines?: number; // legacy support
}

export const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      showHeader = true,
      showFooter = false,
      showAvatar = false,
      contentLines = 3,
      lines,
      delay = 0,
      className,
      ...props
    },
    ref
  ) => {
    const actualContentLines = lines || contentLines;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-surface p-4 space-y-4',
          'animate-fade-in',
          className
        )}
        style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
        {...props}
      >
        {showHeader && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-full">
              {showAvatar && <Skeleton variant="circle" width={40} height={40} delay={delay} />}
              <Skeleton className="h-6 w-1/3" delay={delay + 50} />
            </div>
            <Skeleton className="h-6 w-20" delay={delay + 100} />
          </div>
        )}

        <div className="space-y-2">
          {Array.from({ length: actualContentLines }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn('h-4', i === actualContentLines - 1 ? 'w-2/3' : 'w-full')}
              delay={delay + 150 + i * 50}
            />
          ))}
        </div>

        {showFooter && (
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-9 w-24" rounded="lg" delay={delay + 300} />
            <Skeleton className="h-9 w-24" rounded="lg" delay={delay + 350} />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

function SkeletonTableRow({ columns = 5, delay = 0 }: { columns?: number; delay?: number }) {
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

export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 5, showHeader = true, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
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
);

SkeletonTable.displayName = 'SkeletonTable';

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
    <div className={cn('grid gap-4', gridClasses[columns as keyof typeof gridClasses])}>
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

export interface SkeletonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: 'sm' | 'md' | 'lg';
}

export const SkeletonGroup = React.forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ direction = 'row', gap = 'md', className, children, ...props }, ref) => {
    const gapClass = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-4' : 'gap-3';
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          direction === 'column' ? 'flex-col' : 'flex-row items-center',
          gapClass,
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
