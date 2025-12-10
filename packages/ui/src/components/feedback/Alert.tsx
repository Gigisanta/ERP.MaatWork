import React from 'react';
import Icon, { type IconName } from '../Icon.js';
import { cn } from '../../utils/cn.js';

/**
 * Props for the Alert component
 */
export interface AlertProps {
  /** Visual variant of the alert */
  variant?: 'info' | 'success' | 'warning' | 'error' | 'secondary';
  /** Optional title displayed above the alert content */
  title?: string;
  /** Alert content */
  children: React.ReactNode;
  /** Whether to show the icon (default: true) */
  icon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantConfig = {
  info: {
    icon: 'info' as IconName,
    className: 'border-info bg-info-subtle text-text',
    iconClassName: 'text-info',
  },
  success: {
    icon: 'check-circle' as IconName,
    className: 'border-success bg-success-subtle text-text',
    iconClassName: 'text-success',
  },
  warning: {
    icon: 'alert-circle' as IconName,
    className: 'border-warning bg-warning-subtle text-text',
    iconClassName: 'text-warning',
  },
  error: {
    icon: 'x-circle' as IconName,
    className: 'border-error bg-error-subtle text-text',
    iconClassName: 'text-error',
  },
  secondary: {
    icon: 'info' as IconName,
    className: 'border-secondary bg-secondary-subtle text-text',
    iconClassName: 'text-secondary',
  },
};

/**
 * Alert component for displaying informational, success, warning, or error messages.
 * Uses Open Sans (body font) for content and Poppins (display font) for titles.
 *
 * @example
 * ```tsx
 * <Alert variant="error" title="Error">
 *   Something went wrong
 * </Alert>
 *
 * <Alert variant="secondary" title="New Feature">
 *   Check out our latest update!
 * </Alert>
 * ```
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, children, icon = true, className, ...props }, ref) => {
    const config = variantConfig[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4 font-body',
          config.className,
          className
        )}
        {...props}
      >
        <div className="flex items-start space-x-3">
          {icon && (
            <Icon
              name={config.icon}
              size={16}
              className={cn('flex-shrink-0 mt-0.5', config.iconClassName)}
            />
          )}
          <div className="flex-1">
            {title && (
              <h4 className="mb-1 text-sm font-semibold leading-none font-display">{title}</h4>
            )}
            <div className="text-sm">{children}</div>
          </div>
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

/**
 * Alert Title component - displays a title within an alert
 */
export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight font-display', className)}
    {...props}
  />
));

AlertTitle.displayName = 'AlertTitle';

/**
 * Alert Description component - displays description text within an alert
 */
export const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed font-body', className)} {...props} />
));

AlertDescription.displayName = 'AlertDescription';
