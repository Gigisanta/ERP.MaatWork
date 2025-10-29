import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../utils/cn';

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  id?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({
  label,
  helperText,
  error,
  className,
  id,
  ...props
}, ref) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = helperText ? `${switchId}-helper` : undefined;
  const errorId = error ? `${switchId}-error` : undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <SwitchPrimitive.Root
          ref={ref}
          id={switchId}
          className={cn(
            'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
            'bg-surface-hover transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:bg-primary',
            'data-[state=unchecked]:bg-surface-hover',
            error && 'ring-2 ring-error',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(helperId, errorId)}
          {...props}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
              'data-[state=checked]:translate-x-4',
              'data-[state=unchecked]:translate-x-0'
            )}
          />
        </SwitchPrimitive.Root>
        
        {label && (
          <label
            htmlFor={switchId}
            className="text-sm font-medium text-text-primary cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
          >
            {label}
          </label>
        )}
      </div>

      {helperText && !error && (
        <p id={helperId} className="text-sm text-text-secondary">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';





