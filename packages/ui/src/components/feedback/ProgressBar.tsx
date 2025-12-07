import React from 'react';
import { cn } from '../../utils/cn';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Custom label text (overrides default percentage) */
  label?: string;
  /** Size variant */
  size?: ProgressBarSize;
  /** Color variant */
  variant?: ProgressBarVariant;
  /** Whether the progress is indeterminate (shows animation instead of value) */
  indeterminate?: boolean;
  /** Whether to animate the progress changes */
  animated?: boolean;
  /** Whether to show striped pattern */
  striped?: boolean;
}

const sizeClasses: Record<ProgressBarSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantClasses: Record<ProgressBarVariant, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
};

const trackVariantClasses: Record<ProgressBarVariant, string> = {
  default: 'bg-primary/20',
  success: 'bg-success/20',
  warning: 'bg-warning/20',
  error: 'bg-error/20',
  info: 'bg-info/20',
};

/**
 * ProgressBar component for showing progress of operations.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ProgressBar value={50} />
 * 
 * // With label
 * <ProgressBar value={75} showLabel />
 * 
 * // Custom label
 * <ProgressBar value={30} label="Uploading..." />
 * 
 * // Different sizes and variants
 * <ProgressBar value={60} size="lg" variant="success" />
 * 
 * // Indeterminate (loading)
 * <ProgressBar indeterminate />
 * 
 * // Striped and animated
 * <ProgressBar value={50} striped animated />
 * ```
 */
export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({
    value,
    max = 100,
    showLabel = false,
    label,
    size = 'md',
    variant = 'default',
    indeterminate = false,
    animated = true,
    striped = false,
    className,
    ...props
  }, ref) => {
    // Clamp value between 0 and max
    const clampedValue = Math.min(Math.max(0, value), max);
    const percentage = (clampedValue / max) * 100;

    const displayLabel = label ?? `${Math.round(percentage)}%`;

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Label */}
        {(showLabel || label) && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-text-secondary">
              {displayLabel}
            </span>
            {showLabel && !label && (
              <span className="text-xs text-text-muted">
                {clampedValue}/{max}
              </span>
            )}
          </div>
        )}

        {/* Track */}
        <div
          className={cn(
            'w-full rounded-full overflow-hidden',
            trackVariantClasses[variant],
            sizeClasses[size]
          )}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : clampedValue}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={displayLabel}
        >
          {/* Fill */}
          <div
            className={cn(
              'h-full rounded-full',
              variantClasses[variant],
              animated && !indeterminate && 'transition-all duration-300 ease-out',
              indeterminate && 'animate-progress-indeterminate',
              striped && 'bg-stripes'
            )}
            style={{
              width: indeterminate ? '30%' : `${percentage}%`,
            }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

/**
 * ProgressBarWithStatus - ProgressBar with status message
 */
export interface ProgressBarWithStatusProps extends ProgressBarProps {
  /** Status message to show below the progress bar */
  status?: string;
  /** Additional details (shown in smaller text) */
  details?: string;
}

export const ProgressBarWithStatus = React.forwardRef<HTMLDivElement, ProgressBarWithStatusProps>(
  ({ status, details, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <ProgressBar {...props} />
        {(status || details) && (
          <div className="flex justify-between items-center">
            {status && (
              <span className="text-sm text-text-secondary">{status}</span>
            )}
            {details && (
              <span className="text-xs text-text-muted">{details}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

ProgressBarWithStatus.displayName = 'ProgressBarWithStatus';

/**
 * CircularProgress - Circular progress indicator
 */
export interface CircularProgressProps extends React.SVGAttributes<SVGSVGElement> {
  /** Current progress value (0-100) */
  value: number;
  /** Size of the circle in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color variant */
  variant?: ProgressBarVariant;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Whether the progress is indeterminate */
  indeterminate?: boolean;
}

export const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  ({
    value,
    size = 48,
    strokeWidth = 4,
    variant = 'default',
    showLabel = false,
    indeterminate = false,
    className,
    ...props
  }, ref) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedValue = Math.min(Math.max(0, value), 100);
    const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

    const colorClasses: Record<ProgressBarVariant, string> = {
      default: 'stroke-primary',
      success: 'stroke-success',
      warning: 'stroke-warning',
      error: 'stroke-error',
      info: 'stroke-info',
    };

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={cn(
            indeterminate && 'animate-spin',
            className
          )}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          {...props}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={cn(
              colorClasses[variant],
              !indeterminate && 'transition-all duration-300 ease-out'
            )}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: indeterminate ? circumference * 0.75 : strokeDashoffset,
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
            }}
          />
        </svg>
        {showLabel && !indeterminate && (
          <span className="absolute text-xs font-medium text-text-secondary">
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';
