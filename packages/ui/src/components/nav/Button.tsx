import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'destructive';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Button component with brand styling.
 *
 * Variants:
 * - `primary`: Purple background (main CTA, highlights)
 * - `secondary`: Black background (secondary actions)
 * - `accent`: Green background (success/growth actions)
 * - `outline`: Bordered button
 * - `ghost`: Transparent background
 * - `destructive`: Red background (dangerous actions)
 *
 * @example
 * ```tsx
 * <Button variant="primary">Save Changes</Button>
 * <Button variant="secondary">Learn More</Button>
 * <Button variant="accent">Start Free Trial</Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-body font-semibold',
          'rounded-md transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          // Variant styles with enhanced micro-interactions
          {
            // Primary - Purple with glow effect (main CTAs, highlights)
            'bg-primary text-text-inverse shadow-primary hover:bg-primary-hover hover:shadow-primary-lg hover:-translate-y-0.5 focus:ring-primary':
              variant === 'primary',
            // Secondary - Black with subtle shadow
            'bg-secondary text-text-inverse hover:bg-secondary-hover hover:shadow-lg hover:-translate-y-0.5 focus:ring-secondary':
              variant === 'secondary',
            // Accent - Green with glow
            'bg-accent text-secondary hover:bg-accent-hover hover:shadow-lg hover:-translate-y-0.5 focus:ring-accent':
              variant === 'accent',
            // Outline - with purple hover and subtle lift
            'border border-border bg-transparent text-text hover:bg-primary-subtle hover:text-primary hover:border-primary hover:shadow-sm focus:ring-primary':
              variant === 'outline',
            // Ghost - with purple hover
            'bg-transparent text-text hover:bg-primary-subtle hover:text-primary focus:ring-primary':
              variant === 'ghost',
            // Destructive - Red with danger glow
            'bg-error text-text-inverse hover:bg-error-hover hover:shadow-lg hover:-translate-y-0.5 focus:ring-error':
              variant === 'destructive',
          },
          // Size styles
          {
            'px-3 py-1.5 text-sm gap-1.5': size === 'sm',
            'px-4 py-2 text-sm gap-2': size === 'md',
            'px-6 py-3 text-base gap-2.5': size === 'lg',
          },
          // Full width
          fullWidth && 'w-full',
          // Loading cursor
          loading && 'cursor-wait',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
