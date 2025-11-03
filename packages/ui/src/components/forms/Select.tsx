import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  items: SelectItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectProps
>(({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select an option...',
  disabled = false,
  label,
  helperText,
  error,
  className,
  id,
  required = false,
  ..._props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  // Filter out items with empty string values (Radix UI Select doesn't allow empty string values)
  // Also filter out items with undefined/null values for safety
  const validItems = React.useMemo(() => {
    return items.filter(item => {
      if (item.value === '' || item.value == null) {
        // Only warn in development (when window is available and not in production build)
        if (typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app')) {
          console.warn(
            `Select component received an item with invalid value (empty string or null/undefined):`,
            item,
            `This item will be filtered out.`
          );
        }
        return false;
      }
      return true;
    });
  }, [items]);

  // Normalize empty string values to undefined for Radix UI compatibility
  const normalizedValue = value === '' ? undefined : value;
  const normalizedDefaultValue = defaultValue === '' ? undefined : defaultValue;

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-text"
        >
          {label}
          {required && <span className="text-error ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <SelectPrimitive.Root
        value={normalizedValue}
        defaultValue={normalizedDefaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={selectId}
            className={cn(
              'flex w-full items-center justify-between',
              'px-3 py-2',
              'bg-surface text-text',
              'border rounded-md',
              'text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-hover',
              'transition-colors',
              error ? 'border-error focus:border-error' : 'border-border focus:border-primary',
              className
            )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(helperId, errorId)}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'relative z-[9999] max-h-96 min-w-[8rem] overflow-hidden rounded-md border',
              'bg-surface shadow-lg border-border',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1 bg-surface">
              {validItems.map((item) => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                    'bg-surface hover:bg-surface-hover focus:bg-surface-hover text-text',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    'data-[highlighted]:bg-surface-hover'
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-3.5 w-3.5" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

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

Select.displayName = 'Select';





