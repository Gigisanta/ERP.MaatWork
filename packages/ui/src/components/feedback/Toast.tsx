import React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { Icon, type IconName } from '../Icon.js';
import { cn } from '../../utils/cn.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const variantConfig: Record<ToastVariant, { icon: IconName; className: string }> = {
  info: {
    icon: 'info',
    className: 'border-info/20 bg-info-subtle text-text',
  },
  success: {
    icon: 'check-circle',
    className: 'border-success/20 bg-success-subtle text-text',
  },
  warning: {
    icon: 'alert-circle',
    className: 'border-warning/20 bg-warning-subtle text-text',
  },
  error: {
    icon: 'x-circle',
    className: 'border-error/20 bg-error-subtle text-text',
  },
};

export const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
  (
    {
      title,
      description,
      variant = 'info',
      duration = 5000,
      open,
      onOpenChange,
      children,
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant];

    return (
      <ToastPrimitive.Provider swipeDirection="right">
        <ToastPrimitive.Root
          ref={ref}
          className={cn(
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all',
            // Swipe interactions
            'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
            // Enter/Exit animations using new animation utilities
            'data-[state=open]:animate-enter',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full',
            config.className
          )}
          open={open}
          onOpenChange={onOpenChange}
          duration={duration}
          {...props}
        >
          <div className="flex items-start space-x-3 w-full">
            <Icon name={config.icon} size={20} className="flex-shrink-0 mt-0.5 opacity-90" />
            <div className="flex-1 space-y-1">
              <ToastPrimitive.Title className="text-sm font-semibold font-display">
                {title}
              </ToastPrimitive.Title>
              {description && (
                <ToastPrimitive.Description className="text-sm opacity-90 font-body leading-relaxed">
                  {description}
                </ToastPrimitive.Description>
              )}
            </div>
          </div>
          <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:text-text focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100">
            <Icon name="x" size={16} />
          </ToastPrimitive.Close>
          {children}
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className="pointer-events-none fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
      </ToastPrimitive.Provider>
    );
  }
);

Toast.displayName = ToastPrimitive.Root.displayName;

// Toast Action component
export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
      className
    )}
    {...props}
  />
));

ToastAction.displayName = ToastPrimitive.Action.displayName;

// Toast Close component
export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:text-text focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
      className
    )}
    {...props}
  />
));

ToastClose.displayName = ToastPrimitive.Close.displayName;
