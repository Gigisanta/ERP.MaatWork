import React from 'react';
import { cn } from '../../utils/cn.js';

// Export basic types
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

// Re-export variants from the sub-file
export * from './Skeleton/SkeletonVariants.js';
