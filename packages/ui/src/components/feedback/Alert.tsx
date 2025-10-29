import React from 'react';
import Icon, { type IconName } from '../Icon';
import { cn } from '../../utils/cn';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}

const variantConfig = {
  info: {
    icon: 'info' as IconName,
    className: 'border-accent-base bg-accent-subtle text-accent-text',
    iconClassName: 'text-accent-base'
  },
  success: {
    icon: 'check-circle' as IconName,
    className: 'border-success-base bg-success-subtle text-success-text',
    iconClassName: 'text-success-base'
  },
  warning: {
    icon: 'alert-circle' as IconName,
    className: 'border-warning-base bg-warning-subtle text-warning-text',
    iconClassName: 'text-warning-base'
  },
  error: {
    icon: 'x-circle' as IconName,
    className: 'border-error-base bg-error-subtle text-error-text',
    iconClassName: 'text-error-base'
  }
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, children, icon = true, className, ...props }, ref) => {
    const config = variantConfig[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
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
              <h4 className="mb-1 text-sm font-medium leading-none">
                {title}
              </h4>
            )}
            <div className="text-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// Alert Title component
export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));

AlertTitle.displayName = 'AlertTitle';

// Alert Description component
export const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));

AlertDescription.displayName = 'AlertDescription';





